# frozen_string_literal: true

module Api
  module V1
    module Admin
      class BaseController < ::ApplicationController
        include Paginatable

        before_action :authenticate_super_admin!

        private

        def forbidden(message)
          render json: { error: message }, status: :forbidden
        end

        def authenticate_super_admin!
          expected_key = ENV["SUPER_ADMIN_API_KEY"]

          if expected_key.blank?
            Rails.logger.warn("[Admin] SUPER_ADMIN_API_KEY is not set.")
            return forbidden("Admin portal is not configured")
          end

          header = request.headers["Authorization"]
          token  = header&.split(" ")&.last

          unless token && ActiveSupport::SecurityUtils.secure_compare(token, expected_key)
            render json: { error: "Unauthorized", code: "unauthorized", details: {} }, status: :unauthorized
          end
        end
      end
    end
  end
end
