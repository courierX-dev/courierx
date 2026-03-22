# frozen_string_literal: true

module Api
  module V1
    class ProviderConnectionsController < BaseController
      before_action :set_provider_connection, only: [:show, :update, :destroy, :verify]

      def index
        connections = current_tenant.provider_connections.order(priority: :asc)
        render json: connections.map { |c| connection_json(c) }
      end

      def show
        render json: connection_json(@connection)
      end

      def create
        connection = current_tenant.provider_connections.build(connection_params)
        if connection.save
          # Verify credentials asynchronously-ish: call Go engine to validate
          verification = ProviderVerificationService.call(connection)
          render json: connection_json(connection.reload).merge(verification: verification), status: :created
        else
          render json: { errors: connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @connection.update(connection_params)
          # Re-verify if credentials changed
          if connection_params[:api_key].present? || connection_params[:secret].present?
            verification = ProviderVerificationService.call(@connection)
            render json: connection_json(@connection.reload).merge(verification: verification)
          else
            render json: connection_json(@connection)
          end
        else
          render json: { errors: @connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def verify
        result = ProviderVerificationService.call(@connection)
        render json: connection_json(@connection.reload).merge(verification: result)
      end

      def destroy
        @connection.destroy!
        head :no_content
      end

      private

      def set_provider_connection
        @connection = current_tenant.provider_connections.find(params[:id])
      end

      def connection_params
        # Accept plaintext credentials — model encrypts them before saving.
        # Never expose the encrypted_* columns directly to clients.
        params.permit(:provider, :mode, :status, :display_name, :weight, :priority,
                       :region, :smtp_host, :smtp_port,
                       :api_key, :secret)
      end

      def connection_json(c)
        {
          id: c.id, provider: c.provider, mode: c.mode, status: c.status,
          display_name: c.display_name, weight: c.weight, priority: c.priority,
          success_rate: c.success_rate, avg_latency_ms: c.avg_latency_ms,
          consecutive_failures: c.consecutive_failures,
          last_health_check_at: c.last_health_check_at,
          created_at: c.created_at
        }
      end
    end
  end
end
