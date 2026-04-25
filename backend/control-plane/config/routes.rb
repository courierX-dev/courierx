Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Sidekiq Web UI
  # SECURITY: Protected by HTTP Basic Auth in all environments including development.
  # The previous config used an empty string as the default password — any browser
  # could access /sidekiq with username "admin" and an empty password field.
  # Now requires SIDEKIQ_USERNAME and SIDEKIQ_PASSWORD env vars. The UI is
  # disabled entirely if SIDEKIQ_PASSWORD is not set, to prevent silent exposure.
  require "sidekiq/web"
  # api_only Rails strips cookies/sessions from the global middleware stack,
  # so give the Web mount its own Rack::Session::Cookie for CSRF + flash.
  # (Sidekiq 7 dropped the Sinatra-based Sidekiq::Web.set :sessions API.)
  # Rack 3 moved session middleware into the rack-session gem; not autoloaded.
  require "rack/session/cookie"
  Sidekiq::Web.use Rack::Session::Cookie,
    secret:    Rails.application.secret_key_base,
    same_site: :lax,
    max_age:   86_400
  sidekiq_password = ENV.fetch("SIDEKIQ_PASSWORD", nil)
  if sidekiq_password.present?
    Sidekiq::Web.use Rack::Auth::Basic do |username, password|
      ActiveSupport::SecurityUtils.secure_compare(username, ENV.fetch("SIDEKIQ_USERNAME", "admin")) &
      ActiveSupport::SecurityUtils.secure_compare(password, sidekiq_password)
    end
    mount Sidekiq::Web => "/sidekiq"
  elsif Rails.env.development?
    # In development with no password set, mount without auth but log a loud warning
    Rails.logger.warn "⚠️  [SECURITY] Sidekiq Web UI is mounted without authentication. Set SIDEKIQ_PASSWORD to require auth."
    mount Sidekiq::Web => "/sidekiq"
  else
    # In non-development environments without a password configured, do not mount the UI.
    Rails.logger.error "❌ [SECURITY] Sidekiq Web UI is DISABLED because SIDEKIQ_PASSWORD is not set. Set this env var to enable the UI."
  end

  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      # ── Auth ──
      post  "auth/register",  to: "auth#register"
      post  "auth/login",     to: "auth#login"
      get   "auth/me",        to: "auth#me"
      patch "auth/me",        to: "auth#update"
      delete "auth/me",       to: "auth#destroy"
      get   "auth/readiness", to: "auth#readiness"
      post  "auth/activate",  to: "auth#activate"

      # ── Inbound provider webhooks (public, each provider verifies its own signature) ──
      post "webhooks/sendgrid", to: "provider_webhooks/sendgrid#create"
      post "webhooks/mailgun",  to: "provider_webhooks/mailgun#create"
      post "webhooks/ses",      to: "provider_webhooks/ses#create"
      # Resend & Postmark are BYOK-per-tenant — each connection has its own
      # webhook signing secret, so the URL embeds a per-connection token that
      # tells us which ProviderConnection to look up before we verify the body.
      post "webhooks/resend/:token",   to: "provider_webhooks/resend#create",   as: :resend_webhook
      post "webhooks/postmark/:token", to: "provider_webhooks/postmark#create", as: :postmark_webhook

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
      resources :provider_connections, only: [:index, :show, :create, :update, :destroy] do
        member { post :verify }
      end
      resources :domains,              only: [:index, :show, :create, :update, :destroy] do
        member { post :verify }
      end
      resources :routing_rules,        only: [:index, :show, :create, :update, :destroy]
      resources :emails,               only: [:index, :show, :create]
      resources :email_templates,       only: [:index, :show, :create, :update, :destroy] do
        member do
          post :preview
          post :duplicate
        end
        collection do
          post :generate
        end
      end

      # ── Team management ──
      resources :team_members, only: [:index, :update, :destroy]
      resources :invitations, only: [:index, :create, :show] do
        member do
          post :accept
          post :revoke
          post :resend
        end
      end
      resources :suppressions,         only: [:index, :create, :destroy]
      resources :webhook_endpoints,    only: [:index, :show, :create, :update, :destroy] do
        member do
          get  :deliveries
          post :test
        end
      end
      resources :mcp_connections,      only: [:index, :show, :create, :update, :destroy]
      resources :usage_stats,          only: [:index]

      # ── Super Admin Portal ──
      namespace :admin do
        resources :tenants, only: [:index, :show, :create, :update, :destroy] do
          member do
            post :impersonate
          end
        end
      end
    end
  end
end
