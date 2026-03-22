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

  GO_ENGINE_URL = ENV.fetch("GO_CORE_URL", "http://localhost:8080")

  def perform
    ProviderConnection.where(status: %w[active degraded]).find_each do |pc|
      check_provider(pc)
    end
  end

  private

  def check_provider(pc)
    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    response = Faraday.get("#{GO_ENGINE_URL}/v1/health/provider/#{pc.provider}") do |req|
      req.options.timeout      = 10
      req.options.open_timeout = 5
    end

    latency_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round

    if response.success?
      pc.update!(
        consecutive_failures: 0,
        avg_latency_ms:       latency_ms,
        last_health_check_at: Time.current,
        status:               pc.status == "degraded" ? "active" : pc.status
      )
    else
      handle_failure(pc, "HTTP #{response.status}")
    end
  rescue Faraday::Error => e
    handle_failure(pc, e.message)
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
