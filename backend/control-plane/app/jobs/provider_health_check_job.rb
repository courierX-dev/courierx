# frozen_string_literal: true

# ProviderHealthCheckJob
#
# Runs periodically. Pings the Go engine health endpoint for each
# active provider. Updates success_rate, avg_latency_ms, and
# consecutive_failures. Auto-degrades after 3 consecutive failures.
#
class ProviderHealthCheckJob
  include Sidekiq::Job

  sidekiq_options queue: :low, retry: 1

  GO_ENGINE_URL    = ENV.fetch("GO_CORE_URL",    "http://localhost:8080")
  GO_SHARED_SECRET = ENV.fetch("GO_CORE_SECRET", "dev-secret")

  def perform
    ProviderConnection.where(status: %w[active degraded]).find_each do |pc|
      check_provider(pc)
    end
  end

  private

  def check_provider(pc)
    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    # Use the existing verify-provider endpoint — it validates live credentials
    # rather than hitting a non-existent per-provider health route.
    response = Faraday.post("#{GO_ENGINE_URL}/internal/verify-provider") do |req|
      req.headers["Content-Type"]      = "application/json"
      req.headers["X-Internal-Secret"] = GO_SHARED_SECRET
      req.options.timeout      = 10
      req.options.open_timeout = 5
      req.body = { provider: pc.provider, config: provider_config(pc) }.to_json
    end

    latency_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round

    if response.success?
      body = begin JSON.parse(response.body) rescue {} end
      if body["verified"]
        pc.update!(
          consecutive_failures: 0,
          avg_latency_ms:       latency_ms,
          last_health_check_at: Time.current,
          status:               pc.status == "degraded" ? "active" : pc.status
        )
      else
        handle_failure(pc, body["error"] || "Provider verification failed")
      end
    else
      handle_failure(pc, "HTTP #{response.status}")
    end
  rescue Faraday::Error => e
    handle_failure(pc, e.message)
  end

  def provider_config(pc)
    case pc.provider
    when "sendgrid"  then { "apiKey" => pc.api_key }
    when "mailgun"   then { "apiKey" => pc.api_key, "domain" => pc.smtp_host, "region" => pc.region.presence || "us" }
    when "aws_ses"   then { "accessKeyId" => pc.api_key, "secretAccessKey" => pc.secret, "region" => pc.region.presence || "us-east-1" }
    when "postmark"  then { "serverToken" => pc.api_key }
    when "resend"    then { "apiKey" => pc.api_key }
    when "smtp"      then { "host" => pc.smtp_host, "port" => pc.smtp_port, "user" => pc.api_key, "pass" => pc.secret }
    else {}
    end
  end

  def handle_failure(pc, error_msg)
    failures = pc.consecutive_failures + 1
    attrs = {
      consecutive_failures: failures,
      last_health_check_at: Time.current
    }

    if failures >= 3 && pc.status == "active"
      attrs[:status] = "degraded"
      Rails.logger.error("[HealthCheck] Provider #{pc.display_name} degraded after #{failures} failures: #{error_msg}")
    end

    pc.update!(attrs)
  end
end
