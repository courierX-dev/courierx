# frozen_string_literal: true

# RateLimitable
#
# Sets X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
# headers on every response. Uses the tenant's rate_limit_policy.
#
module RateLimitable
  extend ActiveSupport::Concern

  included do
    after_action :set_rate_limit_headers
  end

  private

  def set_rate_limit_headers
    return unless current_tenant&.rate_limit_policy

    policy = current_tenant.rate_limit_policy
    limit  = policy.max_per_minute

    # Simple per-minute counter via Rails cache
    cache_key = "rate_limit:#{current_tenant.id}:#{Time.current.to_i / 60}"
    current   = Rails.cache.increment(cache_key, 1, expires_in: 60) || 1

    response.set_header("X-RateLimit-Limit",     limit.to_s)
    response.set_header("X-RateLimit-Remaining", [limit - current, 0].max.to_s)
    response.set_header("X-RateLimit-Reset",     ((Time.current.to_i / 60 + 1) * 60).to_s)
  end
end
