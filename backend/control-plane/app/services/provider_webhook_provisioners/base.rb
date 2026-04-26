# frozen_string_literal: true

module ProviderWebhookProvisioners
  # Shared HTTP helpers and result conventions. See module top-level
  # comment in app/services/provider_webhook_provisioners.rb for contract.
  class Base
    def provision(_connection)
      raise NotImplementedError
    end

    def revoke(_connection)
      raise NotImplementedError
    end

    protected

    # Public base URL the provider's webhooks should POST back to. Required
    # for auto-provisioning — without it, we can't tell the provider where
    # to send events.
    #
    # Resolution order:
    #   1. PUBLIC_API_URL              — explicit, recommended for production
    #   2. https://RAILWAY_PUBLIC_DOMAIN — auto-set on Railway-hosted services
    #   3. nil                          — caller surfaces a config error to the UI
    def public_base_url
      explicit = ENV["PUBLIC_API_URL"].to_s.strip
      return explicit unless explicit.empty?

      railway = ENV["RAILWAY_PUBLIC_DOMAIN"].to_s.strip
      return "https://#{railway}" unless railway.empty?

      nil
    end

    # Resolve the inbound webhook URL for this connection, returning a
    # tagged result so callers can short-circuit with a clear failure
    # instead of generic "Missing webhook URL".
    def resolve_webhook_url(connection)
      base = public_base_url
      if base.nil?
        # Sidekiq runs in a separate process from the API on most deploys —
        # if the operator set PUBLIC_API_URL on the API service but not on
        # the worker service, this is the error they'll hit. The job logs
        # the resolved base_url at start so they can see which side is
        # missing it.
        return [ nil, failure(
          "Server configuration: PUBLIC_API_URL is not set on the worker process. " \
          "Set it on the same Railway/Render service that runs Sidekiq, then redeploy.",
          category: :config
        ) ]
      end

      url = connection.webhook_url(base_url: base)
      return [ nil, failure("Couldn't build a webhook URL for this connection.", category: :config) ] if url.nil?

      [ url, nil ]
    end

    def http_request(method, url, headers: {}, body: nil, basic_auth: nil)
      uri  = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl       = uri.scheme == "https"
      http.open_timeout  = 10
      http.read_timeout  = 20

      klass = case method
      when :get    then Net::HTTP::Get
      when :post   then Net::HTTP::Post
      when :put    then Net::HTTP::Put
      when :patch  then Net::HTTP::Patch
      when :delete then Net::HTTP::Delete
      end

      req = klass.new(uri.request_uri, default_headers.merge(headers))
      req.basic_auth(*basic_auth) if basic_auth
      req.body = body.to_json if body && !body.is_a?(String)
      req.body = body         if body.is_a?(String)

      response = http.request(req)
      parsed = response.body.to_s.empty? ? {} : (JSON.parse(response.body) rescue {})
      { status: response.code.to_i, body: parsed }
    end

    def default_headers
      { "Content-Type" => "application/json", "Accept" => "application/json" }
    end

    # category: :provider — the third-party API rejected our request
    #           :config   — our own configuration is wrong (PUBLIC_API_URL etc.)
    #           :credentials — the BYOK creds on this connection are missing/invalid
    # Frontend uses this to render the right banner.
    def failure(message, category: :provider)
      { success: false, status: "failed", error: message, error_category: category.to_s }
    end

    def success(external_id:, signing_secret:, status: "auto")
      {
        success:        true,
        status:         status,
        external_id:    external_id,
        signing_secret: signing_secret
      }
    end
  end
end
