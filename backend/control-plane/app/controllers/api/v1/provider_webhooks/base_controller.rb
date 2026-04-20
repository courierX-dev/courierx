# frozen_string_literal: true

module Api
  module V1
    module ProviderWebhooks
      # Base controller for inbound provider webhook receivers.
      # These endpoints are PUBLIC (no JWT/API key auth) — each provider
      # controller verifies authenticity via the provider's own signature scheme.
      class BaseController < ActionController::API
        # No Authenticatable concern — signature verification handles auth

        rescue_from StandardError do |e|
          Rails.logger.error("[ProviderWebhook] Unhandled error: #{e.class} #{e.message}")
          head :ok # Always return 200 to prevent provider retries on our errors
        end

        private

        def process_events(events)
          results = events.map { |event| ProviderEventProcessor.call(**event) }
          successful = results.count(&:success)
          Rails.logger.info("[ProviderWebhook] Processed #{successful}/#{results.size} events")
          head :ok
        end

        def raw_body
          @raw_body ||= request.raw_post
        end
      end
    end
  end
end
