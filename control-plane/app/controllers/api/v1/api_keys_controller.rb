# frozen_string_literal: true

module Api
  module V1
    class ApiKeysController < BaseController
      # GET /api/v1/api_keys
      def index
        keys = current_tenant.api_keys.order(created_at: :desc)
        render json: keys.map { |k| api_key_json(k) }
      end

      # POST /api/v1/api_keys
      def create
        raw_key = "cxk_live_#{SecureRandom.hex(32)}"
        key = current_tenant.api_keys.build(
          name: params[:name],
          key_hash: Digest::SHA256.hexdigest(raw_key),
          key_prefix: raw_key[0..15],
          scopes: params[:scopes] || []
        )

        if key.save
          # Return the raw key ONCE — it's never stored
          render json: api_key_json(key).merge(raw_key: raw_key), status: :created
        else
          render json: { errors: key.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/api_keys/:id/revoke
      def revoke
        key = current_tenant.api_keys.find(params[:id])
        key.revoke!
        render json: api_key_json(key)
      end

      # DELETE /api/v1/api_keys/:id
      def destroy
        key = current_tenant.api_keys.find(params[:id])
        key.destroy!
        head :no_content
      end

      private

      def api_key_json(key)
        {
          id: key.id,
          name: key.name,
          key_prefix: key.key_prefix,
          status: key.status,
          scopes: key.scopes,
          last_used_at: key.last_used_at,
          expires_at: key.expires_at,
          created_at: key.created_at
        }
      end
    end
  end
end
