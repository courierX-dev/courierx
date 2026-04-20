# frozen_string_literal: true

module Api
  module V1
    class AuthController < ApplicationController
      # No auth required for register/login
      skip_before_action :verify_authenticity_token, raise: false

      before_action :authenticate_for_me, only: [:me, :update, :destroy]

      # POST /api/v1/auth/register
      def register
        tenant = Tenant.new(tenant_params)

        if tenant.save
          # Auto-create rate limit policy with defaults
          tenant.create_rate_limit_policy!

          token = JwtService.encode(tenant_id: tenant.id)
          render json: { tenant: tenant_json(tenant), token: token }, status: :created
        else
          render json: { errors: tenant.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        tenant = Tenant.find_by(email: params[:email])

        unless tenant&.authenticate(params[:password])
          return render json: { error: "Invalid email or password" }, status: :unauthorized
        end

        token = JwtService.encode(tenant_id: tenant.id)
        render json: { tenant: tenant_json(tenant), token: token }
      end

      # GET /api/v1/auth/me
      def me
        render json: { tenant: tenant_json(@current_tenant) }
      end

      # PATCH /api/v1/auth/me
      def update
        if @current_tenant.update(update_params)
          render json: { tenant: tenant_json(@current_tenant) }
        else
          render json: { errors: @current_tenant.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/auth/me
      def destroy
        @current_tenant.destroy
        head :no_content
      end

      private

      def tenant_params
        p = params.key?(:auth) ? params.require(:auth) : params
        p.permit(:name, :email, :mode, :password, :password_confirmation)
      end

      def update_params
        params.permit(:name, settings: {})
      end

      def tenant_json(tenant)
        {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          mode: tenant.mode,
          status: tenant.status,
          plan_id: tenant.plan_id,
          settings: tenant.settings,
          created_at: tenant.created_at
        }
      end

      def authenticate_for_me
        token = request.headers["Authorization"]&.split(" ")&.last
        payload = JwtService.decode(token) if token
        @current_tenant = Tenant.find_by(id: payload&.dig(:tenant_id))

        render json: { error: "Unauthorized" }, status: :unauthorized unless @current_tenant
      end
    end
  end
end
