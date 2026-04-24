# frozen_string_literal: true

# CloudClient
#
# Thin, edition-aware client for the separate cloud service (billing,
# waitlist, compliance, sub-accounts, usage aggregation).
#
#   CloudClient.enabled?                       # true iff CLOUD_SERVICE_URL set
#   CloudClient.check_send_allowed!(tenant:, count: 1)
#   CloudClient.publish_event!(event_type:, payload:)
#
# Design notes:
# - Sync gating calls (check_send_allowed!) have a short timeout and FAIL OPEN.
#   Billing latency must never block email delivery; cloud service outages are
#   reconciled later via usage records.
# - Async events are delivered via the outbox pattern + CloudEventJob. This
#   method is the sync HTTP layer; events call it from their job.
# - In OSS (CLOUD_SERVICE_URL unset), every method is a no-op returning :allowed
#   so the rest of the app never branches on edition.
class CloudClient
  class Error < StandardError; end

  SYNC_TIMEOUT_SECONDS = 0.5
  EVENT_TIMEOUT_SECONDS = 5

  class << self
    def enabled?
      base_url.present?
    end

    # Sync gate: is this tenant allowed to send `count` more emails this period?
    # Fail-open on any error (timeout, 5xx, network) — see design note above.
    def check_send_allowed!(tenant:, count: 1)
      return :allowed unless enabled?

      response = connection(timeout: SYNC_TIMEOUT_SECONDS).post("/internal/limits/check") do |req|
        req.headers["Content-Type"]      = "application/json"
        req.headers["X-Internal-Secret"] = shared_secret
        req.body = { tenant_id: tenant.id, count: count }.to_json
      end

      return :allowed if response.success?
      body = parse(response.body)
      body["allowed"] ? :allowed : [:denied, body["reason"] || "cloud_limit_denied"]
    rescue Faraday::Error, JSON::ParserError => e
      Rails.logger.warn "[CloudClient] check_send_allowed failed open: #{e.class}: #{e.message}"
      :allowed
    end

    # Durable event publish. Called by CloudEventJob. Raises on failure so the
    # outbox event stays pending and Sidekiq retries it.
    def publish_event!(event_type:, payload:)
      raise Error, "CloudClient disabled" unless enabled?

      response = connection(timeout: EVENT_TIMEOUT_SECONDS).post("/internal/events") do |req|
        req.headers["Content-Type"]      = "application/json"
        req.headers["X-Internal-Secret"] = shared_secret
        req.body = { event_type: event_type, payload: payload }.to_json
      end

      return true if response.success?
      raise Error, "cloud service returned #{response.status}: #{response.body}"
    rescue Faraday::Error => e
      raise Error, "cloud service unreachable: #{e.message}"
    end

    private

    def base_url      = ENV["CLOUD_SERVICE_URL"].presence
    def shared_secret = ENV["CLOUD_SERVICE_SECRET"].to_s

    def connection(timeout:)
      Faraday.new(base_url) do |f|
        f.options.timeout      = timeout
        f.options.open_timeout = [timeout, 2].min
      end
    end

    def parse(body)
      JSON.parse(body.to_s)
    rescue JSON::ParserError
      {}
    end
  end
end
