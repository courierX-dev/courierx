# config/initializers/rack_attack.rb

class Rack::Attack
  ### Cache store (must be shared across Puma workers) ###
  Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
  )

  ### Safelist ###

  # Health checks never rate-limited
  safelist("allow-health-check") do |req|
    req.path == "/up" || req.path == "/health"
  end

  ### Block rules ###

  # Block IPs that hammer auth with bad credentials (track via throttle fail2ban)
  blocklist("block-auth-abusers") do |req|
    Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 20, findtime: 300, bantime: 1800) do
      req.path.start_with?("/api/v1/auth") && req.post?
    end
  end

  ### Throttle rules ###

  # General API: 60 req/min per IP — baseline protection
  throttle("req/ip", limit: 60, period: 60) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # Email sending: STRICTER than general (20/min per IP, 200/min per authenticated tenant)
  # NOTE: This was previously 120/min — that was backwards. Email is the highest-abuse vector.
  throttle("emails/ip", limit: 20, period: 60) do |req|
    req.ip if req.path == "/api/v1/emails" && req.post?
  end

  # Per-tenant email throttle via Bearer token — keyed on the first 16 chars of the token
  # (not the full token for privacy; collision risk is negligible at this key length)
  throttle("emails/tenant", limit: 200, period: 60) do |req|
    if req.path == "/api/v1/emails" && req.post?
      token = req.env["HTTP_AUTHORIZATION"]&.split(" ")&.last
      token&.slice(0, 16)
    end
  end

  # Bulk send endpoint: tighter still — 5/min per IP, 30/min per tenant
  throttle("bulk-send/ip", limit: 5, period: 60) do |req|
    req.ip if req.path == "/api/v1/emails/bulk" && req.post?
  end

  throttle("bulk-send/tenant", limit: 30, period: 60) do |req|
    if req.path == "/api/v1/emails/bulk" && req.post?
      token = req.env["HTTP_AUTHORIZATION"]&.split(" ")&.last
      token&.slice(0, 16)
    end
  end

  # Waitlist: 5/min per IP
  throttle("waitlist/ip", limit: 5, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/waitlist")
  end

  # Auth endpoints: 10/min per IP (brute-force protection on login/register)
  throttle("auth/ip", limit: 10, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/auth") && req.post?
  end

  # Admin endpoints: 30/min per IP (stricter because high privilege)
  throttle("admin/ip", limit: 30, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/admin")
  end

  # Provider webhook endpoints: 300/min per IP (SNS/Mailgun/SendGrid may burst)
  throttle("webhooks-inbound/ip", limit: 300, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/webhooks")
  end

  ### Logging ###

  ActiveSupport::Notifications.subscribe("throttle.rack_attack") do |_name, _start, _finish, _request_id, payload|
    req = payload[:request]
    Rails.logger.warn(
      "[Rack::Attack] Throttled: rule=#{req.env['rack.attack.matched']} " \
      "ip=#{req.ip} path=#{req.path} ua=#{req.user_agent.to_s.truncate(80)}"
    )
  end

  ActiveSupport::Notifications.subscribe("blocklist.rack_attack") do |_name, _start, _finish, _request_id, payload|
    req = payload[:request]
    Rails.logger.warn(
      "[Rack::Attack] Blocked: rule=#{req.env['rack.attack.matched']} ip=#{req.ip} path=#{req.path}"
    )
  end

  ### Custom 429 Response ###

  self.throttled_responder = lambda do |env|
    match_data  = env["rack.attack.match_data"]
    now         = match_data[:epoch_time]
    retry_after = match_data[:period] - (now % match_data[:period])

    [
      429,
      {
        "Content-Type" => "application/json",
        "Retry-After"  => retry_after.to_s
      },
      [{
        error:   "Rate limit exceeded",
        code:    "rate_limit_exceeded",
        details: {
          retry_after: retry_after,
          limit:       match_data[:limit],
          period:      match_data[:period]
        }
      }.to_json]
    ]
  end

  self.blocklisted_responder = lambda do |env|
    [
      403,
      { "Content-Type" => "application/json" },
      [{ error: "Forbidden", code: "ip_blocked" }.to_json]
    ]
  end
end
