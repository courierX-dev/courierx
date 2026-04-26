# frozen_string_literal: true

module ProviderWebhookProvisioners
  # SendGrid Event Webhook provisioning.
  # API: https://docs.sendgrid.com/api-reference/event-webhooks
  #
  # SendGrid's classic Event Webhook is account-level — one URL per account
  # that receives all event types. In BYOK each tenant runs their own
  # SendGrid account, so this is fine: one webhook per connection ↔ one
  # account.
  #
  # Flow:
  #   1. PATCH /v3/user/webhooks/event/settings  → set URL + enable events
  #   2. PATCH /v3/user/webhooks/event/settings/signed { enabled: true }
  #         → SendGrid generates an ECDSA keypair and returns the public key.
  #           Use that key to verify inbound payloads.
  #
  # The "external_id" we record is a literal string ("account") since the
  # webhook is account-singular and not addressable by ID.
  class Sendgrid < Base
    BASE_URL = "https://api.sendgrid.com"

    def provision(connection)
      return failure("SendGrid API key not set on this connection") if connection.api_key.blank?

      url, err = resolve_webhook_url(connection)
      return err if err

      settings = http_request(:patch, "#{BASE_URL}/v3/user/webhooks/event/settings",
        headers: auth_header(connection),
        body:    event_settings_payload(url)
      )

      return failure(error_message(settings, "configure event webhook")) unless settings[:status].between?(200, 299)

      signed = http_request(:patch, "#{BASE_URL}/v3/user/webhooks/event/settings/signed",
        headers: auth_header(connection),
        body:    { enabled: true }
      )

      # If the account doesn't have signed webhooks available (rare; some
      # legacy plans), fall through with needs_signing_key so the user knows
      # we set up the URL but verification needs manual action.
      unless signed[:status].between?(200, 299)
        return success(external_id: "account", signing_secret: nil, status: "needs_signing_key")
      end

      public_key = signed[:body]["public_key"]
      if public_key.blank?
        return success(external_id: "account", signing_secret: nil, status: "needs_signing_key")
      end

      success(external_id: "account", signing_secret: public_key)
    end

    def revoke(connection)
      # Don't blindly disable an account-level webhook the tenant might be
      # using for something else. Best-effort: only flip the URL off if it
      # still points at us.
      current = http_request(:get, "#{BASE_URL}/v3/user/webhooks/event/settings",
        headers: auth_header(connection))

      return { success: true } unless current[:status].between?(200, 299)

      ours = connection.webhook_url(base_url: public_base_url)
      return { success: true } unless current[:body]["url"].to_s == ours.to_s

      disabled = http_request(:patch, "#{BASE_URL}/v3/user/webhooks/event/settings",
        headers: auth_header(connection),
        body:    { enabled: false, url: "" }
      )

      return { success: true } if disabled[:status].between?(200, 299)
      { success: false, error: error_message(disabled, "disable event webhook") }
    end

    private

    def auth_header(connection)
      { "Authorization" => "Bearer #{connection.api_key}" }
    end

    def event_settings_payload(url)
      {
        enabled: true,
        url:     url,
        # Delivery & engagement events
        delivered:       true,
        bounce:          true,
        dropped:         true,
        deferred:        true,
        spam_report:     true,
        unsubscribe:     true,
        group_unsubscribe: true,
        group_resubscribe: true,
        open:            true,
        click:           true,
        processed:       true
      }
    end

    def error_message(res, action)
      err = res[:body]["errors"]&.first&.dig("message") || res[:body]["error"] || "HTTP #{res[:status]}"
      "SendGrid #{action}: #{err}"
    end
  end
end
