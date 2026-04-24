# frozen_string_literal: true

module Api
  module V1
    class WebhookEndpointsController < BaseController
      before_action :set_endpoint, only: [:show, :update, :destroy, :deliveries, :test]

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

      # GET /api/v1/webhook_endpoints/:id/deliveries
      def deliveries
        records = WebhookDelivery.where(webhook_endpoint_id: @endpoint.id)
                                 .order(created_at: :desc)
                                 .limit(50)
        render json: records.map { |d|
          {
            id: d.id,
            success: d.success,
            response_status: d.response_status,
            response_body: d.response_body&.truncate(2000),
            attempt_count: d.attempt_count,
            delivered_at: d.delivered_at,
            next_retry_at: d.next_retry_at,
            created_at: d.created_at,
            event_type: d.payload["event_type"] || d.payload["event"],
            payload: d.payload
          }
        }
      end

      # POST /api/v1/webhook_endpoints/:id/test
      # Fires a synthetic ping payload through the regular delivery job so the
      # tenant can confirm their endpoint is reachable.
      def test
        payload = {
          "event_type" => "ping",
          "tenant_id"  => current_tenant.id,
          "timestamp"  => Time.current.iso8601,
          "test"       => true
        }
        WebhookDeliveryJob.perform_async(@endpoint.id, payload)
        render json: { message: "Test event enqueued" }, status: :accepted
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
