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

    def public_base_url
      ENV.fetch("PUBLIC_API_URL", "https://api.courierx.dev")
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

    def failure(message)
      { success: false, status: "failed", error: message }
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
