# frozen_string_literal: true

# EmailDispatchService
#
# Entry point for sending an email. Validates input, checks suppressions,
# creates the Email record + OutboxEvent, and enqueues the Sidekiq job.
#
# Usage:
#   result = EmailDispatchService.call(tenant: tenant, params: { to_email: "...", ... })
#   result[:success] # => true/false
#   result[:email]   # => Email record
#   result[:error]   # => error message on failure
#
class EmailDispatchService
  def self.call(tenant:, params:)
    new(tenant, params).call
  end

  def initialize(tenant, params)
    @tenant = tenant
    @params = params
  end

  def call
    # 0. Resolve template if template_id is provided
    resolve_template! if @params[:template_id].present?

    # 1. Idempotency check
    idem_key = @params.dig(:metadata, :idempotency_key)
    if idem_key.present?
      existing = @tenant.emails
                        .where("metadata->>'idempotency_key' = ?", idem_key)
                        .where("created_at > ?", 24.hours.ago)
                        .first
      return { success: true, email: existing, idempotent: true } if existing
    end

    # 2. Pre-flight: confirm at least one provider connection can send this
    #    message. The resolver enforces (a) tenant owns the from_email's domain,
    #    (b) at least one connected provider has the domain verified on its
    #    side, (c) connections are healthy, (d) quotas have headroom.
    #    Demo-mode skips this gate — those tenants use Go's mock provider so
    #    new accounts can exercise the send flow before any DNS setup.
    unless @tenant.mode == "demo"
      resolution = EligibleConnectionsResolver.call(
        tenant:     @tenant,
        from_email: @params[:from_email],
        tags:       @params[:tags] || []
      )

      if resolution.empty?
        return { success: false, error: preflight_error(resolution.reason, @params[:from_email]) }
      end
    end

    # 3. Check suppression list
    if Suppression.suppressed?(@tenant.id, @params[:to_email])
      email = create_email(status: "suppressed")
      return { success: false, error: "Recipient is suppressed", email: email }
    end

    # 3b. Plan gate — only metered segments hit the cloud limit checker.
    # `byok` tenants pay their own provider and CourierX never owes for the
    # send, so they're unmetered. `demo` (free trial) and `managed` (paid plan)
    # are the metered segments. In OSS (no cloud service), the feature flag is
    # off and this is a no-op regardless of mode.
    if CourierX::Edition.feature?(:billing_enforcement) && @tenant.mode != "byok"
      limit = CloudClient.check_send_allowed!(tenant: @tenant, count: 1)
      if limit.is_a?(Array) && limit.first == :denied
        return { success: false, error: "plan_limit_exceeded: #{limit.last}" }
      end
    end

    # 4+5. Create email record and outbox event atomically. A crash between the
    # two writes would otherwise leave an email stuck in "queued" forever with no
    # processor event to deliver it.
    email = outbox = nil
    ActiveRecord::Base.transaction do
      email = create_email!(status: "queued")
      outbox = OutboxEvent.create!(
        event_type: "send_email",
        payload: { email_id: email.id, tenant_id: @tenant.id, idempotency_key: idem_key }.compact,
        status: "pending"
      )
      email.update!(outbox_event_id: outbox.id)
    end

    # 5. Enqueue Sidekiq job for immediate processing
    OutboxProcessorJob.perform_async(outbox.id)

    { success: true, email: email }
  rescue => e
    { success: false, error: e.message }
  end

  private

  # Maps a resolver rejection reason to a tenant-facing error string.
  # Phrased in the marketing voice — direct, specific, actionable.
  def preflight_error(reason, from_email)
    from_domain = from_email.to_s.split("@").last
    case reason
    when :invalid_from_email
      "from_email is missing or malformed"
    when :unverified_domain
      "Sending domain '#{from_domain}' isn't verified on this account. Add it under Domains and complete DNS verification before sending."
    when :no_verified_provider
      "No connected provider has '#{from_domain}' verified. Verify the domain on at least one of your connected providers — see the domain's setup panel for each provider's DNS records."
    when :all_unhealthy
      "All providers eligible for '#{from_domain}' are currently degraded or inactive. Check Provider Connections."
    when :all_over_cap
      "All eligible providers for '#{from_domain}' have hit their cap for this period. Increase a cap or connect another provider."
    else
      "Unable to send from '#{from_domain}'."
    end
  end

  def resolve_template!
    template = @tenant.email_templates.find(@params[:template_id])
    variables = @params[:variables] || {}
    rendered = template.render_preview(variables)

    @template = template
    # Template fields fill in blanks — explicit params take priority
    @params[:subject]   ||= rendered[:subject]
    @params[:html_body] ||= rendered[:html_body]
    @params[:text_body] ||= rendered[:text_body]
  end

  def create_email(status:)
    @tenant.emails.create(
      from_email:        @params[:from_email],
      from_name:         @params[:from_name],
      to_email:          @params[:to_email],
      to_name:           @params[:to_name],
      reply_to:          @params[:reply_to],
      subject:           @params[:subject],
      html_body:         @params[:html_body],
      text_body:         @params[:text_body],
      tags:              @params[:tags] || [],
      metadata:          @params[:metadata] || {},
      email_template:    @template,
      status:            status
    )
  end

  def create_email!(status:)
    @tenant.emails.create!(
      from_email:        @params[:from_email],
      from_name:         @params[:from_name],
      to_email:          @params[:to_email],
      to_name:           @params[:to_name],
      reply_to:          @params[:reply_to],
      subject:           @params[:subject],
      html_body:         @params[:html_body],
      text_body:         @params[:text_body],
      tags:              @params[:tags] || [],
      metadata:          @params[:metadata] || {},
      email_template:    @template,
      status:            status
    )
  end
end
