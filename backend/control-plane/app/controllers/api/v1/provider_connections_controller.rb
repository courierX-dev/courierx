# frozen_string_literal: true

module Api
  module V1
    class ProviderConnectionsController < BaseController
      before_action :set_provider_connection, only: [ :show, :update, :destroy, :verify, :resync_webhook ]

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
          # Seed the provider quota with known free-tier defaults so cap-aware
          # routing has something to filter on before the tenant adjusts it
          # (and before any introspection job runs to pull live numbers).
          ProviderQuotaTemplate.seed!(connection)

          # Verify credentials synchronously so the dialog can show a result;
          # if credentials work, fan this connection out to existing tenant
          # domains so each domain gets a pending DPV with the provider's DNS
          # records ready to display.
          verification = ProviderVerificationService.call(connection)
          if verification[:verified]
            ProviderConnectionPropagationJob.perform_async(connection.id)

            # Auto-provision the inbound webhook on the provider side so the
            # tenant doesn't have to paste URLs/secrets by hand. Default for
            # new connections is webhook_auto_managed=true; the job no-ops
            # for providers without an auto path.
            if auto_webhook_eligible?(connection)
              ProviderWebhookProvisionJob.perform_async(connection.id)
            end
          end
          render json: connection_json(connection.reload).merge(verification: verification), status: :created
        else
          render json: { errors: connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @connection.update(connection_params)
          credentials_changed = connection_params[:api_key].present? || connection_params[:secret].present?
          toggled_to_auto     = connection_params.key?(:webhook_auto_managed) &&
                                ActiveModel::Type::Boolean.new.cast(connection_params[:webhook_auto_managed])

          # Re-verify if credentials changed
          verification = nil
          if credentials_changed
            verification = ProviderVerificationService.call(@connection)
          end

          # Re-provision if the tenant just flipped auto on, or if credentials
          # changed (the old webhook may now be wired to dead creds on the
          # provider side).
          if (toggled_to_auto || credentials_changed) && auto_webhook_eligible?(@connection)
            ProviderWebhookProvisionJob.perform_async(@connection.id)
          end

          response = connection_json(@connection.reload)
          response = response.merge(verification: verification) if verification
          render json: response
        else
          render json: { errors: @connection.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def verify
        result = ProviderVerificationService.call(@connection)
        render json: connection_json(@connection.reload).merge(verification: result)
      end

      # POST /api/v1/provider_connections/:id/resync_webhook
      #
      # Forces a re-provision of the inbound webhook on the provider side.
      # Flips auto_managed to true if the tenant had previously opted out
      # (e.g. legacy manual setup) — the explicit click is the consent.
      def resync_webhook
        unless ProviderConnection::AUTO_WEBHOOK_PROVIDERS.include?(@connection.provider)
          return render json: { errors: [ "Auto webhook provisioning is not supported for this provider" ] },
                        status: :unprocessable_entity
        end

        @connection.update_columns(webhook_auto_managed: true) unless @connection.webhook_auto_managed?
        ProviderWebhookProvisionJob.perform_async(@connection.id)

        render json: connection_json(@connection.reload).merge(
          webhook: { queued: true, message: "Webhook provisioning queued" }
        )
      end

      def destroy
        # Best-effort revoke on the provider side BEFORE destroying the
        # record (we still have decrypted credentials in memory). Done
        # synchronously to avoid leaking plaintext API keys into Sidekiq
        # Redis args. Failure is non-fatal — orphan webhook on the
        # provider side is recoverable; blocking destroy on a flaky third-
        # party API isn't.
        revoke_provider_webhook(@connection) if @connection.webhook_auto?

        @connection.destroy!
        head :no_content
      rescue ActiveRecord::InvalidForeignKey => e
        Rails.logger.error("[ProviderConnections] destroy FK violation: #{e.message}")
        render json: { errors: [ "This provider is still referenced by other records. Try excluding it instead." ] },
               status: :unprocessable_entity
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
                       :api_key, :secret, :webhook_secret, :webhook_auto_managed)
      end

      def auto_webhook_eligible?(connection)
        ProviderConnection::AUTO_WEBHOOK_PROVIDERS.include?(connection.provider) &&
          connection.webhook_auto_managed?
      end

      def revoke_provider_webhook(connection)
        result = ProviderWebhookProvisioners.for(connection.provider).revoke(connection)
        unless result[:success]
          Rails.logger.warn(
            "[ProviderConnections] revoke failed connection=#{connection.id} " \
            "provider=#{connection.provider} error=#{result[:error]}"
          )
        end
      rescue StandardError => e
        Rails.logger.warn("[ProviderConnections] revoke crashed connection=#{connection.id}: #{e.class} #{e.message}")
      end

      def connection_json(c)
        json = {
          id: c.id, provider: c.provider, mode: c.mode, status: c.status,
          display_name: c.display_name, weight: c.weight, priority: c.priority,
          success_rate: c.success_rate, avg_latency_ms: c.avg_latency_ms,
          consecutive_failures: c.consecutive_failures,
          last_health_check_at: c.last_health_check_at,
          region: c.region, smtp_host: c.smtp_host, smtp_port: c.smtp_port,
          created_at: c.created_at
        }

        # Webhook setup info — surfaced for every provider with an auto path
        # (Resend, Postmark, SendGrid, Mailgun). Frontend uses `status` and
        # `auto_managed` to render the right pill + buttons.
        if (summary = c.webhook_summary)
          json[:webhook]                = summary
          json[:webhook_url]            = summary[:url]            # legacy field, kept for old clients
          json[:webhook_secret_present] = summary[:secret_present] # legacy field
        end

        json
      end
    end
  end
end
