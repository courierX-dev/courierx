# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      # GET /api/v1/dashboard/compliance
      #
      # Returns the current tenant's KYC/compliance review state. Compliance
      # data lives in the cloud service — this endpoint proxies the JWT
      # request to cloud's /internal/dashboard/compliance. 404 in OSS.
      class ComplianceController < Api::V1::BaseController
        def index
          data = CloudClient.dashboard_compliance(tenant: current_tenant)
          render json: data
        rescue CloudClient::Disabled
          render json: {
            error:   "Compliance review is only available on CourierX Cloud",
            code:    "cloud_disabled",
            details: {}
          }, status: :not_found
        rescue CloudClient::Error => e
          Rails.logger.warn "[Dashboard::Compliance] cloud error: #{e.message}"
          render json: {
            error:   "Compliance service temporarily unavailable",
            code:    "cloud_unavailable",
            details: {}
          }, status: :bad_gateway
        end
      end
    end
  end
end
