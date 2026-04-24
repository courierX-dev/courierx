# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end

# Sidekiq Web needs cookie sessions for CSRF + flash. This app runs api_only,
# so the global middleware stack has no cookies/session. Give the Web mount
# its own self-contained Rack session instead of widening the whole API stack.
require "sidekiq/web"
Sidekiq::Web.set :sessions, {
  secret:    Rails.application.secret_key_base,
  same_site: :lax
}
