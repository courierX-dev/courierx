# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives webhook POSTs from Postmark.
      #
      # Postmark sends one event per request as a flat JSON object.
      # Authentication: Postmark supports HTTP Basic Auth on the webhook URL —
      # we expect the configured Basic credentials to be present. Tenants
      # configure their webhook URL in Postmark's UI as
      #   https://USER:PASS@api.courierx.dev/api/v1/webhooks/postmark
      # where USER:PASS == POSTMARK_WEBHOOK_USERNAME : POSTMARK_WEBHOOK_PASSWORD.
      #
      # RecordType values:
      #   Delivery, Bounce, SpamComplaint, Open, Click, SubscriptionChange
      #
      class PostmarkController < BaseController
        before_action :verify_basic_auth

        # POST /api/v1/webhooks/postmark
        def create
          event = parse_event
          return head(:ok) unless event

          process_events([event])
        end

        private

        def verify_basic_auth
          expected_user = ENV["POSTMARK_WEBHOOK_USERNAME"]
          expected_pass = ENV["POSTMARK_WEBHOOK_PASSWORD"]
          return if expected_user.blank? || expected_pass.blank? # Dev mode

          authenticate_or_request_with_http_basic("Postmark webhook") do |u, p|
            ActiveSupport::SecurityUtils.secure_compare(u.to_s, expected_user) &
              ActiveSupport::SecurityUtils.secure_compare(p.to_s, expected_pass)
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
            # Postmark "Type": HardBounce, Transient, SoftBounce, etc.
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
            user_agent:          payload.dig("UserAgent") || payload.dig("Client", "Name"),
            ip_address:          payload["IP"],
            raw_payload:         payload
          }
        end

        def map_event_type(record_type)
          case record_type
          when "Delivery"          then "delivered"
          when "Bounce"            then "bounced"
          when "SpamComplaint"     then "complained"
          when "Open"              then "opened"
          when "Click"             then "clicked"
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
