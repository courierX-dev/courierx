# config/initializers/sentry.rb

if ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.environment = Rails.env
    config.release = "courierx-control-plane@#{`git rev-parse --short HEAD 2>/dev/null`.strip}"

    # Performance monitoring
    config.traces_sample_rate = Rails.env.production? ? 0.1 : 1.0

    # Breadcrumbs
    config.breadcrumbs_logger = [ :active_support_logger, :http_logger ]

    # Filter sensitive params
    config.send_default_pii = false

    # Don't send expected errors
    config.excluded_exceptions += [
      "ActionController::RoutingError",
      "ActiveRecord::RecordNotFound"
    ]

    # Tag every event with tenant context
    config.before_send = lambda do |event, hint|
      if hint[:exception].respond_to?(:record) && hint[:exception].record.respond_to?(:tenant_id)
        event.tags[:tenant_id] = hint[:exception].record.tenant_id
      end
      event
    end

    # Sidekiq integration
    config.traces_sampler = lambda do |sampling_context|
      transaction = sampling_context[:transaction_context]

      # Sample all Sidekiq jobs at 100% in dev, 20% in prod
      if transaction[:op] == "sidekiq"
        Rails.env.production? ? 0.2 : 1.0
      else
        Rails.env.production? ? 0.1 : 1.0
      end
    end
  end
end
