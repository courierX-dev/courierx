# frozen_string_literal: true

module ProviderWebhookProvisioners
  # Resend webhook provisioning.
  # API: https://resend.com/docs/api-reference/webhooks/create-webhook
  #
  # POST /webhooks
  #   body:  { endpoint, events: [...] }
  #   200:   { id: "wh_...", endpoint, events, signing_secret: "whsec_..." }
  #
  # NOTE: Resend's field is `endpoint` (not `endpoint_url`). Sending the
  # wrong key returns 422 "Missing `endpoint` field".
  #
  # The signing secret is returned in the create response only once — store it
  # immediately. Resend's webhook events use Svix (svix-id, svix-timestamp,
  # svix-signature headers); the signing_secret here matches what the inbound
  # ResendController already verifies against.
  class Resend < Base
    BASE_URL = "https://api.resend.com"

    EVENTS = %w[
      email.delivered
      email.bounced
      email.complained
      email.opened
      email.clicked
      email.delivery_delayed
    ].freeze

    def provision(connection)
      return failure("Resend API key not set on this connection", category: :credentials) if connection.api_key.blank?

      url, err = resolve_webhook_url(connection)
      return err if err

      # If we already provisioned a webhook for this connection, update it
      # instead of creating a duplicate.
      if connection.webhook_external_id.present?
        return update_existing(connection, url)
      end

      res = http_request(:post, "#{BASE_URL}/webhooks",
        headers: auth_header(connection),
        body:    { endpoint: url, events: EVENTS }
      )

      return failure(error_message(res, "create webhook")) unless res[:status].between?(200, 201)

      external_id    = res[:body]["id"]
      signing_secret = res[:body]["signing_secret"] || res[:body]["secret"]

      return failure("Resend did not return a signing secret") if signing_secret.blank?

      success(external_id: external_id, signing_secret: signing_secret)
    end

    def revoke(connection)
      return { success: true } if connection.webhook_external_id.blank?

      res = http_request(:delete, "#{BASE_URL}/webhooks/#{connection.webhook_external_id}",
        headers: auth_header(connection))

      return { success: true } if res[:status] == 404 || res[:status].between?(200, 299)
      { success: false, error: error_message(res, "delete webhook") }
    end

    private

    def auth_header(connection)
      { "Authorization" => "Bearer #{connection.api_key}" }
    end

    def update_existing(connection, url)
      res = http_request(:patch, "#{BASE_URL}/webhooks/#{connection.webhook_external_id}",
        headers: auth_header(connection),
        body:    { endpoint: url, events: EVENTS }
      )

      # If the webhook is gone on Resend's side (deleted from their dashboard),
      # fall through to a fresh create.
      if res[:status] == 404
        connection.update_columns(webhook_external_id: nil)
        return provision(connection)
      end

      return failure(error_message(res, "update webhook")) unless res[:status].between?(200, 299)

      # PATCH doesn't re-issue the signing secret. Keep whatever's already
      # stored. If there's no stored secret (e.g. recovering from a partial
      # provision), surface that as needs_signing_key.
      stored_secret = connection.webhook_secret
      if stored_secret.blank?
        return success(external_id: connection.webhook_external_id, signing_secret: nil, status: "needs_signing_key")
      end

      success(external_id: connection.webhook_external_id, signing_secret: stored_secret)
    end

    def error_message(res, action)
      msg = res[:body]["message"] || res[:body]["error"] || "HTTP #{res[:status]}"
      "Resend #{action} failed: #{msg}"
    end
  end
end
