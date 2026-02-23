# frozen_string_literal: true

module Api
  module V1
    class McpConnectionsController < BaseController
      before_action :set_connection, only: [:show, :update, :destroy]

      def index
        render json: current_tenant.mcp_connections.order(created_at: :desc).map { |c| connection_json(c) }
      end

      def show
        render json: connection_json(@connection)
      end

      def create
        raw_secret = SecureRandom.hex(32)
        connection = current_tenant.mcp_connections.build(
          connection_params.merge(
            client_id: "mcp_#{SecureRandom.hex(16)}",
            client_secret_hash: Digest::SHA256.hexdigest(raw_secret)
          )
        )

        if connection.save
          render json: connection_json(connection).merge(client_secret: raw_secret), status: :created
        else
          render json: { errors: connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @connection.update(connection_params)
          render json: connection_json(@connection)
        else
          render json: { errors: @connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @connection.destroy!
        head :no_content
      end

      private

      def set_connection
        @connection = current_tenant.mcp_connections.find(params[:id])
      end

      def connection_params
        params.permit(:name, :description, :status, :require_approval, :max_emails_per_run,
                       permissions: [], allowed_from_emails: [], allowed_tags: [])
      end

      def connection_json(c)
        {
          id: c.id, name: c.name, description: c.description,
          client_id: c.client_id, status: c.status,
          permissions: c.permissions,
          total_emails_sent: c.total_emails_sent,
          last_used_at: c.last_used_at,
          created_at: c.created_at
        }
      end
    end
  end
end
