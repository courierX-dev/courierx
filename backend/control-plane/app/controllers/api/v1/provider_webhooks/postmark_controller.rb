# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives Postmark webhook POSTs.
      #
      # BYOK model: each tenant runs their own Postmark server, so auth is
      # per-ProviderConnection. The URL token identifies which connection sent
      # the webhook. Postmark itself supports two auth schemes; we accept
      # either:
      #
      #   1. HTTP Basic Auth — tenant configures their Postmark webhook URL as
      #      https://USER:PASS@api.courierx.dev/api/v1/webhooks/postmark/<token>
      #      where USER:PASS == connection.webhook_token : connection.webhook_secret.
      #   2. URL token only — Postmark IPs are well-known; if a tenant doesn't
      #      want to set Basic Auth, they can rely on the unguessable URL token.
      #
      # The token alone is sufficient because Postmark webhooks aren't signed,
      # but Basic Auth is recommended for defence-in-depth and is verified
      # against the connection's stored secret if present.
      #
      # URL: POST /api/v1/webhooks/postmark/:token
      #
      class PostmarkController < BaseController
        before_action :load_connection
        before_action :verify_basic_auth

        # POST /api/v1/webhooks/postmark/:token
        def create
          event = parse_event
          return head(:ok) unless event

          process_events([event])
        end

        private

        def load_connection
          token = params[:token].to_s
          @connection = ProviderConnection.find_by(webhook_token: token, provider: "postmark")
          head(:unauthorized) and return unless @connection
        end

        def verify_basic_auth
          # If the tenant set a webhook_secret, require Basic Auth matching it.
          # If not set, the URL token alone is the credential.
          expected = @connection.webhook_secret
          return if expected.blank?

          authenticate_or_request_with_http_basic("Postmark webhook") do |_user, pass|
            ActiveSupport::SecurityUtils.secure_compare(pass.to_s, expected)
          end
        end

        def parse_event
          payload    = JSON.parse(raw_body)
          event_type = map_event_type(payload["RecordType"])
          return nil unless event_type

          message_id = payload["MessageID"]
          return nil if message_id.blank?

          bounce_type = nil
          bounce_code = nil
          bounce_msg  = nil
          if event_type == "bounced"
            type        = payload["Type"].to_s
            bounce_type = type.start_with?("Hard") ? "permanent" : "temporary"
            bounce_code = payload["TypeCode"]&.to_s
            bounce_msg  = payload["Description"] || payload["Details"]
          end

          {
            provider:            "postmark",
            provider_message_id: message_id,
            event_type:          event_type,
            occurred_at:         parse_timestamp(payload["DeliveredAt"] || payload["BouncedAt"] || payload["ReceivedAt"]),
            recipient:           payload["Recipient"] || payload["Email"],
            bounce_type:         bounce_type,
            bounce_code:         bounce_code,
            bounce_message:      bounce_msg,
            link_url:            payload["OriginalLink"],
            user_agent:          payload["UserAgent"] || payload.dig("Client", "Name"),
            ip_address:          payload["IP"],
            raw_payload:         payload
          }
        end

        def map_event_type(record_type)
          case record_type
          when "Delivery"           then "delivered"
          when "Bounce"             then "bounced"
          when "SpamComplaint"      then "complained"
          when "Open"               then "opened"
          when "Click"              then "clicked"
          when "SubscriptionChange" then "unsubscribed"
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
