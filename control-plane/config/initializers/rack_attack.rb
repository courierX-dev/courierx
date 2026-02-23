# config/initializers/rack_attack.rb

class Rack::Attack
  ### Throttle rules ###

  # 60 requests per minute per IP (unauthenticated / general)
  throttle("req/ip", limit: 60, period: 60) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # 120 requests per minute for email sending (tighter control)
  throttle("emails/ip", limit: 120, period: 60) do |req|
    req.ip if req.path == "/api/v1/emails" && req.post?
  end

  # Waitlist: 5 requests per minute per IP
  throttle("waitlist/ip", limit: 5, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/waitlist")
  end

  # Auth endpoints: 10 attempts per minute per IP (brute-force protection)
  throttle("auth/ip", limit: 10, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/auth") && req.post?
  end

  ### Safelist ###

  # Safelist health checks
  safelist("allow-health-check") do |req|
    req.path == "/up"
  end

  ### Custom 429 Response ###

  self.throttled_responder = lambda do |env|
    match_data = env["rack.attack.match_data"]
    now        = match_data[:epoch_time]
    retry_after = match_data[:period] - (now % match_data[:period])

    [
      429,
      {
        "Content-Type" => "application/json",
        "Retry-After"  => retry_after.to_s
      },
      [{
        error: "Rate limit exceeded",
        code:  "rate_limit_exceeded",
        details: {
          retry_after: retry_after,
          limit:       match_data[:limit],
          period:      match_data[:period]
        }
      }.to_json]
    ]
  end
end
