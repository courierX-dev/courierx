# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives Resend webhook POSTs.
      #
      # BYOK model: every tenant runs their own Resend account, so the webhook
      # signing secret is per-ProviderConnection, not a global env var. Each
      # connection has a unique URL token that we embed in the webhook URL we
      # hand the tenant. Their Resend dashboard signs payloads with the
      # whsec_... secret they paste back into our dashboard.
      #
      # URL: POST /api/v1/webhooks/resend/:token
      #
      # Resend uses Svix for signing — headers svix-id, svix-timestamp,
      # svix-signature. Signature is HMAC-SHA256 of `id.timestamp.body` using
      # the webhook secret with the `whsec_` prefix stripped + base64-decoded.
      # Reference: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
      #
      class ResendController < BaseController
        before_action :load_connection
        before_action :verify_signature

        # POST /api/v1/webhooks/resend/:token
        def create
          event = parse_event
          return head(:ok) unless event

          process_events([event])
        end

        private

        def load_connection
          token = params[:token].to_s
          @connection = ProviderConnection.find_by(webhook_token: token, provider: "resend")
          # Don't reveal whether a token exists or not — same response either way.
          head(:unauthorized) and return unless @connection
        end

        def verify_signature
          secret = @connection.webhook_secret
          # Connection exists but tenant hasn't pasted the signing secret yet.
          # Reject — we cannot trust unsigned payloads in prod.
          if secret.blank?
            Rails.logger.warn("[Resend Webhook] connection=#{@connection.id} has no webhook_secret set")
            head(:unauthorized) and return
          end

          msg_id        = request.headers["svix-id"]
          msg_timestamp = request.headers["svix-timestamp"]
          msg_signature = request.headers["svix-signature"]

          unless msg_id.present? && msg_timestamp.present? && msg_signature.present?
            head(:unauthorized) and return
          end

          # Reject replays older than 5 minutes
          if (Time.now.to_i - msg_timestamp.to_i).abs > 300
            head(:unauthorized) and return
          end

          key_b64 = secret.start_with?("whsec_") ? secret.sub(/^whsec_/, "") : secret
          key     = Base64.decode64(key_b64)

          signed_payload = "#{msg_id}.#{msg_timestamp}.#{raw_body}"
          expected       = Base64.strict_encode64(
            OpenSSL::HMAC.digest("SHA256", key, signed_payload)
          )

          received = msg_signature.split(" ").map { |s| s.split(",", 2).last }
          unless received.any? { |sig| ActiveSupport::SecurityUtils.secure_compare(sig, expected) }
            head(:unauthorized) and return
          end
        rescue => e
          Rails.logger.warn("[Resend Webhook] signature verification failed: #{e.message}")
          head(:unauthorized) and return
        end

        def parse_event
          payload    = JSON.parse(raw_body)
          event_type = map_event_type(payload["type"])
          return nil unless event_type

          data       = payload["data"] || {}
          message_id = data["email_id"]
          return nil if message_id.blank?

          recipient = Array(data["to"]).first
          bounce    = data["bounce"] || {}

          bounce_type = nil
          if event_type == "bounced"
            sub_type    = bounce["subType"].to_s.downcase
            bounce_type = sub_type == "transient" ? "temporary" : "permanent"
          end

          {
            provider:            "resend",
            provider_message_id: message_id,
            event_type:          event_type,
            occurred_at:         parse_timestamp(payload["created_at"] || data["created_at"]),
            recipient:           recipient,
            bounce_type:         bounce_type,
            bounce_code:         bounce["code"],
            bounce_message:      bounce["message"],
            link_url:            data.dig("click", "link"),
            user_agent:          data.dig("click", "userAgent") || data.dig("open", "userAgent"),
            ip_address:          data.dig("click", "ipAddress") || data.dig("open", "ipAddress"),
            raw_payload:         payload
          }
        end

        def map_event_type(resend_event)
          case resend_event
          when "email.delivered"        then "delivered"
          when "email.bounced"          then "bounced"
          when "email.complained"       then "complained"
          when "email.opened"           then "opened"
          when "email.clicked"          then "clicked"
          when "email.delivery_delayed" then "deferred"
          # email.sent — already marked sent when our outbox call returned 200.
          end
        end

        def parse_timestamp(value)
          return Time.current if value.blank?
          Time.iso8601(value.to_s)
        rescue ArgumentError
          Time.current
        end
      end
    end
  end
end
