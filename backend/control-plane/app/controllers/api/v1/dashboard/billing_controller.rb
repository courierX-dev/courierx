# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      # GET /api/v1/dashboard/billing
      #
      # Returns the current tenant's plan, quota, usage, and recent invoices.
      # Billing state lives in the cloud service — this endpoint proxies the
      # JWT-authenticated request to cloud's /internal/dashboard/billing with
      # the shared secret. In OSS (no cloud service), responds 404.
      class BillingController < Api::V1::BaseController
        def index
          data = CloudClient.dashboard_billing(tenant: current_tenant)
          render json: data
        rescue CloudClient::Disabled
          render json: {
            error:   "Billing is only available on CourierX Cloud",
            code:    "cloud_disabled",
            details: {}
          }, status: :not_found
        rescue CloudClient::Error => e
          Rails.logger.warn "[Dashboard::Billing] cloud error: #{e.message}"
          render json: {
            error:   "Billing service temporarily unavailable",
            code:    "cloud_unavailable",
            details: {}
          }, status: :bad_gateway
        end
      end
    end
  end
end
