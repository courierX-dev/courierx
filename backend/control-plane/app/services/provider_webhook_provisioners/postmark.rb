# frozen_string_literal: true

module ProviderWebhookProvisioners
  # Postmark webhook provisioning.
  # API: https://postmarkapp.com/developer/webhooks/webhooks-api
  #
  # POST /webhooks
  #   headers: X-Postmark-Server-Token: <server_token>
  #   body:    {
  #     Url, MessageStream: "outbound",
  #     Triggers: { Open: { Enabled }, Click: { Enabled }, Delivery: { Enabled },
  #                 Bounce: { Enabled, IncludeContent: false }, SpamComplaint, ... },
  #     HttpAuth: { Username, Password }   ← we generate this; Postmark posts back with Basic Auth
  #   }
  #   200:     { ID: 1234567, ... }
  #
  # Postmark webhooks aren't HMAC-signed; they authenticate by sending HTTP
  # Basic Auth headers we set here. We generate a strong random password and
  # store it as encrypted_webhook_secret, matching what PostmarkController
  # verifies against.
  class Postmark < Base
    BASE_URL = "https://api.postmarkapp.com"

    def provision(connection)
      return failure("Missing server token") if connection.api_key.blank?

      url = connection.webhook_url(base_url: public_base_url)
      return failure("Missing webhook URL") if url.blank?

      # Reuse any previously-stored Basic Auth password — re-rotating on every
      # resync would invalidate Postmark's stored credential mid-flight.
      password = connection.webhook_secret.presence || SecureRandom.urlsafe_base64(32)
      username = connection.webhook_token

      payload = {
        Url:           url,
        MessageStream: "outbound",
        HttpAuth:      { Username: username, Password: password },
        Triggers: {
          Open:          { Enabled: true, PostFirstOpenOnly: false },
          Click:         { Enabled: true },
          Delivery:      { Enabled: true },
          Bounce:        { Enabled: true, IncludeContent: false },
          SpamComplaint: { Enabled: true, IncludeContent: false },
          SubscriptionChange: { Enabled: true }
        }
      }

      if connection.webhook_external_id.present?
        res = http_request(:put, "#{BASE_URL}/webhooks/#{connection.webhook_external_id}",
          headers: auth_header(connection),
          body:    payload
        )

        if res[:status] == 404
          connection.update_columns(webhook_external_id: nil)
          return provision(connection)
        end
      else
        res = http_request(:post, "#{BASE_URL}/webhooks",
          headers: auth_header(connection),
          body:    payload
        )
      end

      return failure(error_message(res)) unless res[:status].between?(200, 299)

      external_id = res[:body]["ID"] || res[:body]["id"]
      success(external_id: external_id.to_s, signing_secret: password)
    end

    def revoke(connection)
      return { success: true } if connection.webhook_external_id.blank?

      res = http_request(:delete, "#{BASE_URL}/webhooks/#{connection.webhook_external_id}",
        headers: auth_header(connection))

      return { success: true } if res[:status] == 404 || res[:status].between?(200, 299)
      { success: false, error: error_message(res) }
    end

    private

    def auth_header(connection)
      {
        "X-Postmark-Server-Token" => connection.api_key,
        "Accept"                  => "application/json"
      }
    end

    def error_message(res)
      msg = res[:body]["Message"] || res[:body]["message"] || "HTTP #{res[:status]}"
      "Postmark webhook API: #{msg}"
    end
  end
end
