# frozen_string_literal: true

module ProviderWebhookProvisioners
  # Mailgun webhook provisioning.
  # API: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Webhooks/
  #
  # Mailgun webhooks are per-domain and one URL per event type. We register
  # all the event types we care about pointing at the same URL.
  #
  #   PUT /v3/{domain}/webhooks/{event_id}
  #     body: url=<our url>
  #
  # Signing key: account-level, not domain-level. The tenant's Mailgun API
  # key may or may not have permission to read the HTTP webhook signing key
  # via API. We attempt the fetch; if it fails we mark the connection
  # `needs_signing_key` so the UI can prompt the user to paste it (one
  # field, vs. setting up 7 webhooks by hand).
  class Mailgun < Base
    EVENT_IDS = %w[
      delivered
      permanent_fail
      temporary_fail
      complained
      opened
      clicked
      unsubscribed
    ].freeze

    def provision(connection)
      return failure("Missing API key") if connection.api_key.blank?
      return failure("Missing Mailgun domain (smtp_host)") if connection.smtp_host.blank?

      url = connection.webhook_url(base_url: public_base_url)
      return failure("Missing webhook URL") if url.blank?

      EVENT_IDS.each do |event_id|
        res = upsert_event_webhook(connection, event_id, url)
        return failure("Mailgun webhook for #{event_id}: HTTP #{res[:status]} #{res[:body]['message']}") unless res[:status].between?(200, 299)
      end

      signing_key = fetch_signing_key(connection)

      if signing_key.present?
        success(external_id: connection.smtp_host, signing_secret: signing_key)
      else
        # URLs are configured, but we couldn't auto-fetch the signing key.
        # Frontend should show a single paste field; once pasted, status flips
        # to "auto".
        success(external_id: connection.smtp_host, signing_secret: nil, status: "needs_signing_key")
      end
    end

    def revoke(connection)
      return { success: true } if connection.smtp_host.blank?

      EVENT_IDS.each do |event_id|
        res = http_request(:delete, "#{api_base(connection)}/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}",
          basic_auth: [ "api", connection.api_key ])
        # 404 is fine — already gone or never set.
        next if res[:status].between?(200, 299) || res[:status] == 404
        return { success: false, error: "Mailgun delete #{event_id}: HTTP #{res[:status]}" }
      end

      { success: true }
    end

    private

    def upsert_event_webhook(connection, event_id, url)
      # Mailgun's webhook endpoints accept form-encoded `url=`. We use PUT for
      # idempotency (creates or replaces).
      uri  = URI("#{api_base(connection)}/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl       = uri.scheme == "https"
      http.open_timeout  = 10
      http.read_timeout  = 20

      req = Net::HTTP::Put.new(uri.request_uri)
      req.basic_auth("api", connection.api_key)
      req.set_form_data("url" => url)

      response = http.request(req)
      parsed = response.body.to_s.empty? ? {} : (JSON.parse(response.body) rescue {})
      { status: response.code.to_i, body: parsed }
    end

    def fetch_signing_key(connection)
      res = http_request(:get, "#{api_base(connection)}/v5/accounts/http-signing-key",
        basic_auth: [ "api", connection.api_key ])
      return nil unless res[:status].between?(200, 299)
      res[:body]["http_signing_key"] || res[:body]["signing_key"]
    end

    def api_base(connection)
      # Mailgun EU region uses a different host; fall back to US otherwise.
      connection.region.to_s.downcase == "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net"
    end
  end
end
