# frozen_string_literal: true

module Api
  module V1
    class WebhookEndpointsController < BaseController
      before_action :set_endpoint, only: [:show, :update, :destroy]

      def index
        render json: current_tenant.webhook_endpoints.order(created_at: :desc).map { |w| endpoint_json(w) }
      end

      def show
        render json: endpoint_json(@endpoint)
      end

      def create
        endpoint = current_tenant.webhook_endpoints.build(
          endpoint_params.merge(secret: SecureRandom.hex(32))
        )
        if endpoint.save
          render json: endpoint_json(endpoint), status: :created
        else
          render json: { errors: endpoint.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @endpoint.update(endpoint_params)
          render json: endpoint_json(@endpoint)
        else
          render json: { errors: @endpoint.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @endpoint.destroy!
        head :no_content
      end

      private

      def set_endpoint
        @endpoint = current_tenant.webhook_endpoints.find(params[:id])
      end

      def endpoint_params
        params.permit(:url, :description, :is_active, events: [])
      end

      def endpoint_json(w)
        {
          id: w.id, url: w.url, description: w.description,
          is_active: w.is_active, events: w.events, created_at: w.created_at
        }
      end
    end
  end
end
