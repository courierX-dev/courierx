# Configure Rack Attack for rate limiting
class Rack::Attack
  # Throttle all requests by IP
  throttle('req/ip', limit: 1000, period: 1.hour) do |req|
    req.ip unless req.path.start_with?('/health')
  end

  # Throttle API key authentication attempts
  throttle('api_key/ip', limit: 5, period: 20.seconds) do |req|
    if req.path == '/api/v1/authenticate' && req.post?
      req.ip
    end
  end

  # Throttle by authenticated API key
  throttle('authenticated/api_key', limit: ENV.fetch('RATE_LIMIT_REQUESTS', 1000).to_i, period: 1.hour) do |req|
    req.env['api_key_id'] if req.env['api_key_id']
  end
end

# Configure cache store for Rack Attack
Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
