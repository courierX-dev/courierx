# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives webhook POSTs from Mailgun.
      #
      # Mailgun sends events as form-encoded or JSON with this structure:
      #   signature: { token, timestamp, signature }
      #   event-data: { event, message.headers.message-id, recipient, ... }
      #
      # Verification: HMAC-SHA256 of (timestamp + token) using the webhook signing key.
      #
      class MailgunController < BaseController
        before_action :verify_signature

        # POST /api/v1/webhooks/mailgun
        def create
          events = parse_events
          process_events(events)
        end

        private

        def verify_signature
          signing_key = ENV["MAILGUN_WEBHOOK_SIGNING_KEY"]
          return if signing_key.blank?

          sig_data  = params.dig("signature") || {}
          timestamp = sig_data["timestamp"].to_s
          token     = sig_data["token"].to_s
          signature = sig_data["signature"].to_s

          unless timestamp.present? && token.present? && signature.present?
            head :unauthorized and return
          end

          expected = OpenSSL::HMAC.hexdigest("SHA256", signing_key, "#{timestamp}#{token}")

          unless ActiveSupport::SecurityUtils.secure_compare(expected, signature)
            Rails.logger.warn("[Mailgun Webhook] Signature verification failed")
            head :unauthorized and return
          end

          # Reject timestamps older than 5 minutes to prevent replay attacks
          if (Time.current.to_i - timestamp.to_i).abs > 300
            head :unauthorized and return
          end
        end

        def parse_events
          event_data = params["event-data"] || params["event_data"]
          return [] unless event_data.is_a?(Hash)

          event_type = map_event_type(event_data["event"])
          return [] unless event_type

          message_id = event_data.dig("message", "headers", "message-id") ||
                       event_data["message-id"]
          # Mailgun wraps message-id in angle brackets
          message_id = message_id&.gsub(/[<>]/, "")

          return [] unless message_id.present?

          severity   = event_data.dig("severity") # "permanent" or "temporary" for bounces
          bounce_type = severity == "permanent" ? "permanent" : "temporary" if event_type == "bounced"

          delivery_status = event_data.dig("delivery-status") || {}

          [{
            provider:            "mailgun",
            provider_message_id: message_id,
            event_type:          event_type,
            occurred_at:         Time.at(event_data["timestamp"].to_f),
            recipient:           event_data["recipient"],
            bounce_type:         bounce_type,
            bounce_code:         delivery_status["code"]&.to_s,
            bounce_message:      delivery_status["message"] || delivery_status["description"],
            link_url:            event_data["url"],
            user_agent:          event_data.dig("client-info", "user-agent"),
            ip_address:          event_data["ip"],
            raw_payload:         event_data.to_unsafe_h
          }]
        end

        def map_event_type(mg_event)
          case mg_event
          when "delivered"            then "delivered"
          when "failed", "rejected"   then "bounced"
          when "complained"           then "complained"
          when "opened"               then "opened"
          when "clicked"              then "clicked"
          when "unsubscribed"         then "unsubscribed"
          end
        end
      end
    end
  end
end
