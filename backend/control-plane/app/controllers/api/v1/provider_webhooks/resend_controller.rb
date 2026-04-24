# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives webhook POSTs from Resend.
      #
      # Resend signs payloads using Svix (svix-id, svix-timestamp, svix-signature).
      # Signature is HMAC-SHA256 of `id.timestamp.body` using the webhook signing
      # secret (configured per-endpoint in Resend dashboard, prefixed `whsec_`).
      #
      # Event types:
      #   email.sent             — accepted by Resend
      #   email.delivered        — delivered to recipient inbox
      #   email.delivery_delayed — temporary delivery issue
      #   email.bounced          — permanent or hard bounce
      #   email.complained       — recipient marked as spam
      #   email.opened           — recipient opened
      #   email.clicked          — recipient clicked a link
      #
      class ResendController < BaseController
        before_action :verify_signature

        # POST /api/v1/webhooks/resend
        def create
          event = parse_event
          return head(:ok) unless event

          process_events([event])
        end

        private

        # Svix signature verification — same scheme used by Resend, Clerk, and
        # several other Svix-powered providers.
        # https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
        def verify_signature
          secret = ENV["RESEND_WEBHOOK_SECRET"]
          return if secret.blank? # Dev mode — accept unsigned

          msg_id        = request.headers["svix-id"]
          msg_timestamp = request.headers["svix-timestamp"]
          msg_signature = request.headers["svix-signature"]

          unless msg_id.present? && msg_timestamp.present? && msg_signature.present?
            head :unauthorized and return
          end

          # Reject replays older than 5 minutes
          ts = msg_timestamp.to_i
          if (Time.now.to_i - ts).abs > 300
            head :unauthorized and return
          end

          # Secret format: `whsec_<base64>`. Strip prefix before decoding.
          key_b64 = secret.start_with?("whsec_") ? secret.sub(/^whsec_/, "") : secret
          key     = Base64.decode64(key_b64)

          signed_payload = "#{msg_id}.#{msg_timestamp}.#{raw_body}"
          expected       = Base64.strict_encode64(
            OpenSSL::HMAC.digest("SHA256", key, signed_payload)
          )

          # Header format: "v1,base64sig v1,base64sig2 ..." — any match accepts.
          received = msg_signature.split(" ").map { |s| s.split(",", 2).last }
          unless received.any? { |sig| ActiveSupport::SecurityUtils.secure_compare(sig, expected) }
            head :unauthorized and return
          end
        rescue => e
          Rails.logger.warn("[Resend Webhook] Signature verification failed: #{e.message}")
          head :unauthorized and return
        end

        def parse_event
          payload = JSON.parse(raw_body)
          event_type = map_event_type(payload["type"])
          return nil unless event_type

          data       = payload["data"] || {}
          message_id = data["email_id"]
          return nil if message_id.blank?

          recipient = Array(data["to"]).first
          bounce    = data["bounce"] || {}

          bounce_type = nil
          if event_type == "bounced"
            # Resend reports `subType: "Permanent"` / `"Transient"` / `"Undetermined"`
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
          # email.sent is the provider acknowledging acceptance — we already
          # mark sent when our outbox call returns 200, so skip it.
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
