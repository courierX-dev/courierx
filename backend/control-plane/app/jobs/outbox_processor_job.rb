# frozen_string_literal: true

# OutboxProcessorJob
#
# Picks up a pending OutboxEvent and POSTs the email payload to the Go
# send engine at GO_CORE_URL/v1/send. On success marks the outbox as
# processed; on failure uses exponential backoff for retries.
#
class OutboxProcessorJob
  include Sidekiq::Job

  # 25 retries with Sidekiq's exponential backoff covers ~21 days. Transient
  # infrastructure failures (timeouts, 5xx, network) MUST keep retrying — we
  # promise zero email loss for non-deterministic errors. Only definitive
  # provider rejections (4xx with permanent error codes) terminate the email.
  sidekiq_options queue: :critical, retry: 25

  # Sidekiq calls this only after all 25 retries are exhausted (~3 weeks).
  # At that point the event is dead, but we deliberately do NOT mark the email
  # as failed: a transient failure that lasted 3 weeks is an operational issue
  # that needs human triage, not a delivery failure to surface to the tenant.
  # The email stays in `queued` and an operator can re-enqueue once the
  # underlying infra is fixed.
  sidekiq_retries_exhausted do |msg, ex|
    outbox_event_id = msg["args"].first
    event = OutboxEvent.find_by(id: outbox_event_id)
    next unless event

    error = "retries exhausted after #{event.attempt_count} attempts: #{ex&.class}: #{ex&.message}"
    event.update!(status: "dead", last_error: error)
    Rails.logger.error "[OutboxProcessor] Event #{event.id} marked dead — needs operator triage"
  end

  GO_ENGINE_URL    = ENV.fetch("GO_CORE_URL", "http://localhost:8080")
  GO_SHARED_SECRET = ENV.fetch("GO_CORE_SECRET", "dev-secret")

  def perform(outbox_event_id)
    Rails.logger.info "[OutboxProcessor] Starting job for outbox_event_id: #{outbox_event_id}"
    
    # Atomic status transition — prevents double-processing when two Sidekiq
    # workers race on the same event (retry storms, duplicate enqueues).
    updated = OutboxEvent.where(id: outbox_event_id, status: "pending")
                         .update_all(status: "processing",
                                     attempt_count: Arel.sql("attempt_count + 1"))
    
    if updated.zero?
      Rails.logger.warn "[OutboxProcessor] No pending event found for ID #{outbox_event_id} - already processed?"
      return
    end

    event = OutboxEvent.find(outbox_event_id)
    Rails.logger.info "[OutboxProcessor] Processing event #{event.id}, attempt #{event.attempt_count}"

    # Assign email before entering the rescue boundary so mark_failed! is
    # always reachable even if a later step raises.
    email  = Email.find_by(id: event.payload["email_id"])
    tenant = Tenant.find(event.payload["tenant_id"])

    # Format addresses — Go expects "Name <email>" or plain "email"
    from = format_address(email.from_email, email.from_name)
    to   = format_address(email.to_email,   email.to_name)

    # Build payload using Go struct JSON tag names (camelCase / short keys)
    payload = {
      from:     from,
      to:       to,
      subject:  email.subject,
      html:     email.html_body,
      text:     email.text_body,
      tags:     email.tags,
      metadata: email.metadata,
      tenantId: tenant.id
    }

    payload[:replyTo]        = email.reply_to                   if email.reply_to.present?
    payload[:idempotencyKey] = event.payload["idempotency_key"] if event.payload["idempotency_key"].present?

    # Include per-tenant BYOK provider chain if configured.
    # Demo-mode tenants skip BYOK injection — Go falls back to its global
    # router, which uses the mock provider when no real ENV providers are set.
    unless tenant.mode == "demo"
      routes = build_provider_routes(tenant, email)
      payload[:providers] = routes if routes.any?
    end

    # SECURITY: Do not enable Faraday body logging on this connection — the
    # request payload contains per-tenant provider credentials in plaintext.
    Rails.logger.info "[OutboxProcessor] Calling Go service at #{GO_ENGINE_URL}/v1/send"
    Rails.logger.info "[OutboxProcessor] Payload keys: #{payload.keys.join(', ')}"
    
    conn = Faraday.new(GO_ENGINE_URL)
    response = conn.post("/v1/send") do |req|
      req.headers["Content-Type"]      = "application/json"
      req.headers["X-Internal-Secret"] = GO_SHARED_SECRET
      req.body = payload.to_json
    end

    Rails.logger.info "[OutboxProcessor] Go service responded with status: #{response.status}"
    
    if response.success?
      Rails.logger.info "[OutboxProcessor] Success! Response body: #{response.body}"
      body = JSON.parse(response.body)
      # Go returns { "messageId": "...", "provider": "sendgrid", ... }
      provider_conn = tenant.provider_connections.active.find_by(provider: body["provider"])
      email.mark_sent!(
        provider_message_id: body["messageId"],
        provider_connection: provider_conn
      )
      event.complete!
    else
      Rails.logger.error "[OutboxProcessor] Go service error! Status: #{response.status}, Body: #{response.body}"
      body      = begin JSON.parse(response.body) rescue {} end
      error_msg = body["error"].presence || "Go engine returned #{response.status}: #{response.body}"

      # 5xx and 408/429 (request timeout, rate-limit) are transient — keep
      # retrying. Email stays in `queued`. Anything else is a definitive
      # rejection from Go (validation error, suppressed recipient, auth failure)
      # and is the only kind of failure we surface to the tenant.
      if response.status >= 500 || response.status == 408 || response.status == 429
        event.fail!(error_msg)
        raise "Go engine #{response.status}: #{error_msg}"
      else
        email.mark_failed!(error: error_msg)
        event.update!(status: "dead", last_error: error_msg)
      end
    end
  rescue Faraday::Error => e
    # Network/timeout — purely transient. Email stays in `queued`, event resets
    # to `pending`, Sidekiq retries with exponential backoff.
    Rails.logger.error "[OutboxProcessor] Faraday connection error: #{e.class} - #{e.message}"
    Rails.logger.error "[OutboxProcessor] Attempted URL: #{GO_ENGINE_URL}/v1/send"
    event&.fail!(e.message)
    raise
  rescue => e
    # Unknown error — treat as transient. We'd rather retry indefinitely than
    # silently drop an email. If it's truly permanent, retries_exhausted will
    # eventually catch it and the event goes dead for operator triage.
    Rails.logger.error "[OutboxProcessor] Unexpected error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    event&.fail!(e.message)
    raise
  end

  private

  # Formats an email address with optional display name.
  def format_address(email_addr, name)
    name.present? ? "#{name} <#{email_addr}>" : email_addr
  end

  # Builds the provider failover chain from the tenant's routing rules.
  # Returns an array of Route hashes in the format Go's types.Route expects.
  # Returns [] if no routing rules are configured (Go falls back to ENV providers).
  def build_provider_routes(tenant, email)
    rule = find_routing_rule(tenant, email)
    return [] unless rule

    rule.routing_rule_providers
        .includes(:provider_connection)
        .by_priority
        .filter_map do |rrp|
          conn = rrp.provider_connection
          next unless conn.status == "active"

          {
            priority: rrp.priority,
            role:     rrp.priority == 1 ? "primary" : "fallback",
            provider: {
              type:   conn.provider,
              config: provider_credentials(conn)
            }
          }
        end
  end

  # Selects the most specific active routing rule for this email.
  # Precedence: tag match → from-domain match → default rule → nil
  def find_routing_rule(tenant, email)
    rules = tenant.routing_rules
                  .active
                  .includes(routing_rule_providers: :provider_connection)

    from_domain = email.from_email.split("@").last

    # 1. Tag match (most specific)
    if email.tags.any?
      tagged = rules.find { |r| r.match_tag.present? && email.tags.include?(r.match_tag) }
      return tagged if tagged
    end

    # 2. From-domain match
    domain_rule = rules.find { |r| r.match_from_domain.present? && r.match_from_domain == from_domain }
    return domain_rule if domain_rule

    # 3. Default rule
    rules.find(&:is_default?)
  end

  # Returns the credential config hash for a provider connection in the
  # format each Go provider implementation expects (matching config map keys).
  def provider_credentials(connection)
    case connection.provider
    when "sendgrid"
      { "apiKey" => connection.api_key }
    when "mailgun"
      {
        "apiKey" => connection.api_key,
        "domain" => connection.smtp_host,   # smtp_host stores the Mailgun sending domain
        "region" => connection.region.presence || "us"
      }
    when "aws_ses"
      {
        "accessKeyId"     => connection.api_key,
        "secretAccessKey" => connection.secret,
        "region"          => connection.region.presence || "us-east-1"
      }
    when "postmark"
      { "serverToken" => connection.api_key }
    when "resend"
      { "apiKey" => connection.api_key }
    when "smtp"
      {
        "host"   => connection.smtp_host,
        "port"   => connection.smtp_port,
        "user"   => connection.api_key,
        "pass"   => connection.secret,
        "useTLS" => connection.smtp_port == 465
      }
    else
      {}
    end
  end
end
