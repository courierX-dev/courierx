# frozen_string_literal: true

# RateLimitable
#
# Enforces per-tenant rate limits BEFORE processing the request (before_action).
# Also sets X-RateLimit-* response headers so clients can self-throttle.
#
# The per-tenant limit comes from the tenant's RateLimitPolicy record.
# Counts are maintained in Redis; the window is the current calendar minute.
#
# Rack::Attack provides IP-level protection globally. This concern adds
# tenant-level enforcement for authenticated requests — a tenant with many IPs
# is still bounded by their own policy limit.
#
module RateLimitable
  extend ActiveSupport::Concern

  included do
    before_action :enforce_rate_limit
    after_action  :set_rate_limit_headers
  end

  private

  # Returns the window count AFTER incrementing, so we can decide before
  # the action runs whether to allow or reject.
  def rate_limit_window_count
    @_rate_limit_count ||= begin
      cache_key = "rate_limit:#{current_tenant.id}:#{Time.current.to_i / 60}"
      Rails.cache.increment(cache_key, 1, expires_in: 70) || 1
    end
  end

  def rate_limit_policy_limit
    @_rate_limit_limit ||= current_tenant&.rate_limit_policy&.max_per_minute
  end

  def enforce_rate_limit
    return unless current_tenant
    return unless rate_limit_policy_limit # no policy = no limit enforced

    count = rate_limit_window_count
    return unless count > rate_limit_policy_limit

    reset_at = ((Time.current.to_i / 60 + 1) * 60)

    response.set_header("X-RateLimit-Limit",     rate_limit_policy_limit.to_s)
    response.set_header("X-RateLimit-Remaining", "0")
    response.set_header("X-RateLimit-Reset",     reset_at.to_s)
    response.set_header("Retry-After",           (reset_at - Time.current.to_i).to_s)

    Rails.logger.warn(
      "[RateLimitable] Tenant #{current_tenant.id} exceeded rate limit " \
      "(#{count}/#{rate_limit_policy_limit} per minute)"
    )

    render json: {
      error:   "Rate limit exceeded",
      code:    "tenant_rate_limit_exceeded",
      details: {
        limit:       rate_limit_policy_limit,
        retry_after: reset_at - Time.current.to_i
      }
    }, status: :too_many_requests
  end

  def set_rate_limit_headers
    return unless current_tenant && rate_limit_policy_limit

    count = rate_limit_window_count
    reset_at = ((Time.current.to_i / 60 + 1) * 60)

    response.set_header("X-RateLimit-Limit",     rate_limit_policy_limit.to_s)
    response.set_header("X-RateLimit-Remaining", [rate_limit_policy_limit - count, 0].max.to_s)
    response.set_header("X-RateLimit-Reset",     reset_at.to_s)
  end
end
