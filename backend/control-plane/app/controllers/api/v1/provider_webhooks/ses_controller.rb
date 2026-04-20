# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives SNS notifications from Amazon SES.
      #
      # SES delivers events via SNS HTTP/HTTPS subscriptions. The flow:
      #   1. SNS sends a SubscriptionConfirmation — we must GET the SubscribeURL
      #   2. SNS sends Notification messages containing SES event JSON
      #
      # SES event types:
      #   - Delivery, Bounce, Complaint, Open, Click
      #
      # The SES message ID is in the "mail.messageId" field.
      #
      # Verification: SNS messages are signed. We verify using the
      # X.509 certificate from the SigningCertURL.
      #
      class SesController < BaseController
        before_action :verify_sns_signature

        # POST /api/v1/webhooks/ses
        def create
          message_type = request.headers["x-amz-sns-message-type"]

          case message_type
          when "SubscriptionConfirmation"
            handle_subscription_confirmation
          when "Notification"
            events = parse_events
            process_events(events)
          else
            head :ok
          end
        end

        private

        def verify_sns_signature
          # SECURITY: Always verify SNS signatures — no development bypass.
          # Previously this skipped verification in development, which allowed SSRF
          # and processing of forged payloads in dev/staging environments.
          begin
            body = JSON.parse(raw_body)
            cert_url = body["SigningCertURL"] || body["SigningCertUrl"]

            # Ensure cert URL is a genuine AWS SNS signing certificate endpoint
            uri = URI.parse(cert_url.to_s)
            unless uri.scheme == "https" && uri.host&.match?(/\Asns\.[a-z0-9-]+\.amazonaws\.com\z/)
              Rails.logger.warn("[SES Webhook] Invalid cert URL host: #{cert_url}")
              head :unauthorized and return
            end

            cert_pem = Net::HTTP.get(uri)
            cert     = OpenSSL::X509::Certificate.new(cert_pem)

            # Build the string to sign based on message type
            message_type   = body["Type"]
            string_to_sign = build_signing_string(body, message_type)
            signature      = Base64.decode64(body["Signature"])

            unless cert.public_key.verify(OpenSSL::Digest::SHA1.new, signature, string_to_sign)
              Rails.logger.warn("[SES Webhook] SNS signature verification failed")
              head :unauthorized and return
            end
          rescue => e
            Rails.logger.warn("[SES Webhook] Signature verification error: #{e.message}")
            head :unauthorized and return
          end
        end

        def build_signing_string(body, message_type)
          fields = case message_type
                   when "Notification"
                     %w[Message MessageId Subject Timestamp TopicArn Type]
                   when "SubscriptionConfirmation", "UnsubscribeConfirmation"
                     %w[Message MessageId SubscribeURL Timestamp Token TopicArn Type]
                   else
                     %w[Message MessageId Timestamp TopicArn Type]
                   end

          fields.each_with_object(+"") do |field, str|
            str << "#{field}\n#{body[field]}\n" if body[field]
          end
        end

        def handle_subscription_confirmation
          body = JSON.parse(raw_body)
          subscribe_url = body["SubscribeURL"]

          if subscribe_url.present?
            uri = URI.parse(subscribe_url)

            # SECURITY: Only follow SubscribeURL if it points to a genuine AWS SNS endpoint.
            # An unauthenticated POST could otherwise trigger SSRF to arbitrary hosts.
            unless sns_url_safe?(uri)
              Rails.logger.warn("[SES Webhook] Rejected SubscribeURL (non-AWS host): #{subscribe_url}")
              head :bad_request and return
            end

            Net::HTTP.get(uri)
            Rails.logger.info("[SES Webhook] Confirmed SNS subscription: #{body["TopicArn"]}")
          end

          head :ok
        end

        # Returns true only for HTTPS URLs on AWS SNS domains.
        def sns_url_safe?(uri)
          uri.scheme == "https" &&
            uri.host.present? &&
            uri.host.match?(/\Asns\.[a-z0-9-]+\.amazonaws\.com\z/)
        end

        def parse_events
          body = JSON.parse(raw_body)
          message = JSON.parse(body["Message"] || "{}")

          notification_type = message["notificationType"] || message["eventType"]
          mail = message["mail"] || {}
          message_id = mail["messageId"]

          return [] unless message_id.present?

          event_type = map_event_type(notification_type)
          return [] unless event_type

          events = []

          case notification_type
          when "Bounce"
            bounce = message["bounce"] || {}
            bounce_type = bounce["bounceType"] == "Permanent" ? "permanent" : "temporary"

            (bounce["bouncedRecipients"] || [{}]).each do |recipient|
              events << {
                provider:            "ses",
                provider_message_id: message_id,
                event_type:          "bounced",
                occurred_at:         Time.parse(bounce["timestamp"] || mail["timestamp"]),
                recipient:           recipient["emailAddress"],
                bounce_type:         bounce_type,
                bounce_code:         recipient["status"],
                bounce_message:      recipient["diagnosticCode"],
                raw_payload:         message
              }
            end

          when "Complaint"
            complaint = message["complaint"] || {}

            (complaint["complainedRecipients"] || [{}]).each do |recipient|
              events << {
                provider:            "ses",
                provider_message_id: message_id,
                event_type:          "complained",
                occurred_at:         Time.parse(complaint["timestamp"] || mail["timestamp"]),
                recipient:           recipient["emailAddress"],
                raw_payload:         message
              }
            end

          when "Delivery"
            delivery = message["delivery"] || {}

            (delivery["recipients"] || []).each do |recipient_email|
              events << {
                provider:            "ses",
                provider_message_id: message_id,
                event_type:          "delivered",
                occurred_at:         Time.parse(delivery["timestamp"] || mail["timestamp"]),
                recipient:           recipient_email,
                raw_payload:         message
              }
            end

          when "Open"
            open_data = message["open"] || {}
            events << {
              provider:            "ses",
              provider_message_id: message_id,
              event_type:          "opened",
              occurred_at:         Time.parse(open_data["timestamp"] || mail["timestamp"]),
              user_agent:          open_data["userAgent"],
              ip_address:          open_data["ipAddress"],
              raw_payload:         message
            }

          when "Click"
            click_data = message["click"] || {}
            events << {
              provider:            "ses",
              provider_message_id: message_id,
              event_type:          "clicked",
              occurred_at:         Time.parse(click_data["timestamp"] || mail["timestamp"]),
              link_url:            click_data["link"],
              user_agent:          click_data["userAgent"],
              ip_address:          click_data["ipAddress"],
              raw_payload:         message
            }
          end

          events
        end

        def map_event_type(ses_type)
          case ses_type
          when "Delivery"  then "delivered"
          when "Bounce"    then "bounced"
          when "Complaint" then "complained"
          when "Open"      then "opened"
          when "Click"     then "clicked"
          end
        end
      end
    end
  end
end
