class AddWebhookProvisioningToProviderConnections < ActiveRecord::Migration[8.1]
  # Adds the columns needed for auto-provisioning provider webhooks (the
  # "managed" mode where we call the provider's API to create the webhook
  # ourselves and capture the signing secret) alongside the existing manual
  # paste flow.
  #
  # webhook_status values:
  #   not_configured     — no webhook set up
  #   auto               — we created and own this webhook on the provider side
  #   manual             — tenant set it up by hand (legacy / opted-out)
  #   failed             — last provisioning attempt errored; see webhook_last_error
  #   needs_signing_key  — webhook created but secret couldn't be auto-fetched
  #   revoked            — was auto, then we deleted it (e.g. on disconnect)
  def change
    add_column :provider_connections, :webhook_external_id,    :string
    add_column :provider_connections, :webhook_status,         :string, default: "not_configured", null: false
    add_column :provider_connections, :webhook_last_error,     :string
    add_column :provider_connections, :webhook_last_synced_at, :datetime
    add_column :provider_connections, :webhook_auto_managed,   :boolean, default: true, null: false

    add_index :provider_connections, :webhook_status

    # Backfill: existing rows with a manually-pasted secret are not
    # auto-managed (don't trample on a tenant's working setup until they opt
    # in via the Resync button). Rows with no secret get the default
    # auto_managed=true and not_configured status.
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE provider_connections
             SET webhook_status       = 'manual',
                 webhook_auto_managed = false
           WHERE encrypted_webhook_secret IS NOT NULL
             AND encrypted_webhook_secret <> ''
        SQL
      end
    end
  end
end
