# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Receives Event Webhook POSTs from SendGrid.
      #
      # Two ingress paths:
      #
      #   POST /api/v1/webhooks/sendgrid           — legacy global URL,
      #     signed with the ECDSA verification key in
      #     SENDGRID_WEBHOOK_VERIFICATION_KEY (single-tenant deployments).
      #
      #   POST /api/v1/webhooks/sendgrid/:token    — BYOK auto-provisioned,
      #     each ProviderConnection has its own token + ECDSA public key
      #     stored in encrypted_webhook_secret. The ProviderWebhookProvisioner
      #     enables Signed Event Webhooks on the tenant's account and persists
      #     the public key returned by SendGrid.
      #
      class SendgridController < BaseController
        before_action :load_connection
        before_action :verify_signature

        # POST /api/v1/webhooks/sendgrid(/:token)
        def create
          events = parse_events
          process_events(events)
        end

        private

        def load_connection
          token = params[:token].to_s
          return if token.blank? # legacy global path

          @connection = ProviderConnection.find_by(webhook_token: token, provider: "sendgrid")
          head(:unauthorized) and return unless @connection
        end

        # SendGrid Signed Event Webhook verification
        # https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
        def verify_signature
          verification_key = @connection&.webhook_secret.presence || ENV["SENDGRID_WEBHOOK_VERIFICATION_KEY"]

          # Skip verification if no key configured (dev mode for global path,
          # or auto-provision still pending for the BYOK path).
          if verification_key.blank?
            # On the BYOK path, missing key means we can't trust this payload.
            head :unauthorized and return if @connection
            return
          end

          signature = request.headers["X-Twilio-Email-Event-Webhook-Signature"]
          timestamp = request.headers["X-Twilio-Email-Event-Webhook-Timestamp"]

          unless signature.present? && timestamp.present?
            head :unauthorized and return
          end

          begin
            public_key = OpenSSL::PKey::EC.new(Base64.decode64(verification_key))
            payload    = timestamp + raw_body
            digest     = OpenSSL::Digest::SHA256.new
            valid      = public_key.dsa_verify_asn1(digest.digest(payload), Base64.decode64(signature))

            head :unauthorized and return unless valid
          rescue => e
            Rails.logger.warn("[SendGrid Webhook] Signature verification failed: #{e.message}")
            head :unauthorized and return
          end
        end

        def parse_events
          payload = JSON.parse(raw_body)
          return [] unless payload.is_a?(Array)

          payload.filter_map do |event|
            event_type = map_event_type(event["event"])
            next unless event_type

            # SendGrid appends ".filter..." to message IDs — strip it
            sg_message_id = event["sg_message_id"]&.split(".")&.first

            next unless sg_message_id.present?

            bounce_type = nil
            if event_type == "bounced"
              # SendGrid: status starting with 5 = permanent, 4 = temporary
              bounce_type = event["status"]&.start_with?("5") ? "permanent" : "temporary"
            end

            {
              provider:            "sendgrid",
              provider_message_id: sg_message_id,
              event_type:          event_type,
              occurred_at:         Time.at(event["timestamp"].to_i),
              recipient:           event["email"],
              bounce_type:         bounce_type,
              bounce_code:         event["status"],
              bounce_message:      event["reason"],
              link_url:            event["url"],
              user_agent:          event["useragent"],
              ip_address:          event["ip"],
              raw_payload:         event
            }
          end
        end

        # Map SendGrid event names to our internal event types
        def map_event_type(sg_event)
          case sg_event
          when "delivered"  then "delivered"
          when "bounce"     then "bounced"
          when "dropped"    then "failed"
          when "spamreport" then "complained"
          when "open"       then "opened"
          when "click"      then "clicked"
          when "unsubscribe" then "unsubscribed"
          end
        end
      end
    end
  end
end
