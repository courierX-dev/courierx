# frozen_string_literal: true

# ProviderWebhookProvisionJob
#
# Calls the appropriate ProviderWebhookProvisioner to create (or update) the
# inbound webhook on the tenant's provider account, then persists the
# returned external_id and signing secret on the ProviderConnection.
#
# Idempotent: re-runs safely. If `webhook_external_id` is already set the
# provisioner takes the update path; if not, it creates.
#
# Skips work entirely when the connection is opted out of auto management
# (`webhook_auto_managed: false`) so a tenant who pasted their own webhook
# isn't surprised by us overwriting it.
class ProviderWebhookProvisionJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(connection_id)
    connection = ProviderConnection.find_by(id: connection_id)
    return unless connection
    return unless ProviderConnection::AUTO_WEBHOOK_PROVIDERS.include?(connection.provider)
    return unless connection.webhook_auto_managed?

    # Log what the worker actually sees for the public URL config — this
    # makes the "API service has the env var, worker doesn't" misconfig
    # diagnosable from worker logs alone.
    Rails.logger.info(
      "[WebhookProvision] starting connection=#{connection_id} " \
      "provider=#{connection.provider} " \
      "PUBLIC_API_URL=#{ENV['PUBLIC_API_URL'].inspect} " \
      "RAILWAY_PUBLIC_DOMAIN=#{ENV['RAILWAY_PUBLIC_DOMAIN'].inspect}"
    )

    provisioner = ProviderWebhookProvisioners.for(connection.provider)
    result      = provisioner.provision(connection)

    if result[:success]
      apply_success(connection, result)
    else
      apply_failure(connection, result[:error], category: result[:error_category])
    end
  rescue StandardError => e
    Rails.logger.error(
      "[WebhookProvision] connection=#{connection_id} provider=#{connection&.provider} " \
      "tenant=#{connection&.tenant_id} crashed: #{e.class} #{e.message}"
    )
    if defined?(Sentry)
      Sentry.with_scope do |scope|
        scope.set_tags(
          job:       "ProviderWebhookProvisionJob",
          provider:  connection&.provider,
          tenant_id: connection&.tenant_id
        )
        scope.set_context("provider_connection", { id: connection_id })
        Sentry.capture_exception(e)
      end
    end
    connection&.update_columns(
      webhook_status:     "failed",
      webhook_last_error: "Unexpected error: #{e.message}".truncate(255)
    )
    raise
  end

  private

  def apply_success(connection, result)
    updates = {
      webhook_status:         result[:status],
      webhook_external_id:    result[:external_id],
      webhook_last_error:     nil,
      webhook_last_synced_at: Time.current
    }

    # Persist the signing secret if the provisioner returned one. For
    # `needs_signing_key` results we leave whatever's already stored (may be
    # nil — UI will surface a paste field).
    if result[:signing_secret].present?
      connection.webhook_secret = result[:signing_secret]
      connection.save!
    end

    connection.update_columns(updates)
    Rails.logger.info(
      "[WebhookProvision] connection=#{connection.id} provider=#{connection.provider} " \
      "tenant=#{connection.tenant_id} status=#{result[:status]}"
    )
  end

  def apply_failure(connection, error, category: nil)
    Rails.logger.warn(
      "[WebhookProvision] connection=#{connection.id} provider=#{connection.provider} " \
      "tenant=#{connection.tenant_id} category=#{category} failed: #{error}"
    )
    if defined?(Sentry)
      Sentry.capture_message(
        "Provider webhook provisioning failed",
        level: :warning,
        tags:  { provider: connection.provider, tenant_id: connection.tenant_id, job: "ProviderWebhookProvisionJob" },
        extra: { error: error.to_s.truncate(255), connection_id: connection.id }
      )
    end
    # Encode the category as a prefix on the persisted message so the
    # frontend can render the right banner without a schema change. Format:
    # "[category] message". The :provider category is implicit (no prefix)
    # since that's the most common case and prefixing every provider error
    # would just be noise.
    prefixed = case category.to_s
               when "config", "credentials" then "[#{category}] #{error}"
               else error.to_s
               end

    connection.update_columns(
      webhook_status:         "failed",
      webhook_last_error:     prefixed.truncate(255),
      webhook_last_synced_at: Time.current
    )
  end
end
