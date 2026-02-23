# frozen_string_literal: true

module Api
  module V1
    class BillingWebhooksController < ApplicationController
      # No auth — signature-verified webhook from Lemon Squeezy or Paddle
      skip_before_action :verify_authenticity_token, raise: false

      # POST /api/v1/billing/webhooks
      def create
        payload   = request.raw_post
        signature = request.headers["X-Signature"] || request.headers["Paddle-Signature"]
        provider  = detect_provider(request.headers)

        unless verify_signature(provider, payload, signature)
          return render json: { error: "Invalid signature", code: "invalid_signature" }, status: :unauthorized
        end

        event = JSON.parse(payload)
        handle_event(provider, event)

        render json: { received: true }, status: :ok
      rescue JSON::ParserError
        render json: { error: "Invalid JSON", code: "bad_request" }, status: :bad_request
      end

      private

      def detect_provider(headers)
        if headers["X-Signature"].present?
          "lemonsqueezy"
        elsif headers["Paddle-Signature"].present?
          "paddle"
        else
          "unknown"
        end
      end

      def verify_signature(provider, payload, signature)
        return false if signature.blank?

        secret = case provider
                 when "lemonsqueezy" then ENV["LEMONSQUEEZY_WEBHOOK_SECRET"]
                 when "paddle"       then ENV["PADDLE_WEBHOOK_SECRET"]
                 end
        return false if secret.blank?

        expected = OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
        ActiveSupport::SecurityUtils.secure_compare(expected, signature)
      end

      def handle_event(provider, event)
        event_type = event.dig("meta", "event_name") || event["event_type"] || event["alert_name"]

        case event_type
        when "subscription_created", "subscription.created"
          handle_subscription_created(provider, event)
        when "subscription_updated", "subscription.updated"
          handle_subscription_updated(provider, event)
        when "subscription_cancelled", "subscription.cancelled", "subscription_canceled"
          handle_subscription_cancelled(provider, event)
        when "subscription_payment_success", "transaction.completed"
          handle_payment_success(provider, event)
        else
          Rails.logger.info("[BillingWebhook] Unhandled event: #{event_type}")
        end
      end

      def handle_subscription_created(provider, event)
        customer_id     = extract_customer_id(provider, event)
        subscription_id = extract_subscription_id(provider, event)
        plan            = extract_plan(provider, event)

        tenant = find_tenant_by_billing(customer_id)
        return unless tenant

        tenant.update!(
          billing_provider:        provider,
          billing_customer_id:     customer_id,
          billing_subscription_id: subscription_id,
          plan:                    plan,
          plan_email_limit:        plan_limit(plan)
        )
        Rails.logger.info("[BillingWebhook] Subscription created for #{tenant.name}: #{plan}")
      end

      def handle_subscription_updated(provider, event)
        subscription_id = extract_subscription_id(provider, event)
        tenant = Tenant.find_by(billing_subscription_id: subscription_id)
        return unless tenant

        plan = extract_plan(provider, event)
        tenant.update!(plan: plan, plan_email_limit: plan_limit(plan))
        Rails.logger.info("[BillingWebhook] Subscription updated for #{tenant.name}: #{plan}")
      end

      def handle_subscription_cancelled(provider, event)
        subscription_id = extract_subscription_id(provider, event)
        tenant = Tenant.find_by(billing_subscription_id: subscription_id)
        return unless tenant

        tenant.update!(plan: "free", plan_email_limit: 100)
        Rails.logger.info("[BillingWebhook] Subscription cancelled for #{tenant.name}")
      end

      def handle_payment_success(provider, event)
        subscription_id = extract_subscription_id(provider, event)
        tenant = Tenant.find_by(billing_subscription_id: subscription_id)
        return unless tenant

        tenant.update!(current_period_ends_at: 30.days.from_now)
        Rails.logger.info("[BillingWebhook] Payment received for #{tenant.name}")
      end

      # ── Helpers ──

      def extract_customer_id(provider, event)
        case provider
        when "lemonsqueezy" then event.dig("data", "attributes", "customer_id")&.to_s
        when "paddle"       then event.dig("data", "customer_id")&.to_s
        end
      end

      def extract_subscription_id(provider, event)
        case provider
        when "lemonsqueezy" then event.dig("data", "id")&.to_s
        when "paddle"       then event.dig("data", "id")&.to_s
        end
      end

      def extract_plan(provider, event)
        variant = case provider
                  when "lemonsqueezy" then event.dig("data", "attributes", "variant_name")
                  when "paddle"       then event.dig("data", "items", 0, "price", "name")
                  end
        normalize_plan(variant)
      end

      def normalize_plan(variant_name)
        return "free" if variant_name.blank?
        name = variant_name.downcase
        if name.include?("enterprise") then "enterprise"
        elsif name.include?("pro")     then "pro"
        elsif name.include?("starter") then "starter"
        else "free"
        end
      end

      def plan_limit(plan)
        case plan
        when "enterprise" then 1_000_000
        when "pro"        then 100_000
        when "starter"    then 10_000
        else 100
        end
      end

      def find_tenant_by_billing(customer_id)
        Tenant.find_by(billing_customer_id: customer_id)
      end
    end
  end
end
