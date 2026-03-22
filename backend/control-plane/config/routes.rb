Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Sidekiq Web UI (dev only — add auth in production)
  require "sidekiq/web"
  if Rails.env.development?
    mount Sidekiq::Web => "/sidekiq"
  else
    Sidekiq::Web.use Rack::Auth::Basic do |username, password|
      ActiveSupport::SecurityUtils.secure_compare(username, ENV.fetch("SIDEKIQ_USERNAME", "admin")) &
      ActiveSupport::SecurityUtils.secure_compare(password, ENV.fetch("SIDEKIQ_PASSWORD", ""))
    end
    mount Sidekiq::Web => "/sidekiq"
  end

  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      # ── Auth ──
      post  "auth/register", to: "auth#register"
      post  "auth/login",   to: "auth#login"
      get   "auth/me",      to: "auth#me"
      patch "auth/me",      to: "auth#update"
      delete "auth/me",     to: "auth#destroy"

      # ── Waitlist (public, no auth) ──
      post "waitlist",        to: "waitlist#create"
      get  "waitlist/status", to: "waitlist#status"

      # ── Billing webhooks (public, signature-verified) ──
      post "billing/webhooks", to: "billing_webhooks#create"

      # ── Health check (public) ──
      get "health", to: "health#show"

      # ── Dashboard ──
      namespace :dashboard do
        get "metrics",    to: "metrics#index"
        get "billing",    to: "billing#index"
        get "compliance", to: "compliance#index"
      end

      # ── Resources ──
      resources :api_keys,             only: [:index, :create, :destroy] do
        member { patch :revoke }
      end
      resources :provider_connections, only: [:index, :show, :create, :update, :destroy]
      resources :domains,              only: [:index, :show, :create, :destroy] do
        member { post :verify }
      end
      resources :routing_rules,        only: [:index, :show, :create, :update, :destroy]
      resources :emails,               only: [:index, :show, :create]
      resources :suppressions,         only: [:index, :create, :destroy]
      resources :webhook_endpoints,    only: [:index, :show, :create, :update, :destroy]
      resources :mcp_connections,      only: [:index, :show, :create, :update, :destroy]
      resources :usage_stats,          only: [:index]

      # ── Super Admin Portal ──
      namespace :admin do
        resources :tenants, only: [:index, :show, :update] do
          member do
            post :impersonate
          end
        end
      end
    end
  end
end
