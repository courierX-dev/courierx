class AddWebhookColumnsToProviderConnections < ActiveRecord::Migration[8.1]
  def change
    # Per-tenant webhook auth. webhook_token is the random URL slug embedded in
    # the inbound URL we hand the tenant; encrypted_webhook_secret stores the
    # provider-specific signing secret (Svix whsec_* for Resend, etc.).
    add_column :provider_connections, :webhook_token,            :string
    add_column :provider_connections, :encrypted_webhook_secret, :text

    add_index :provider_connections, :webhook_token,
              unique: true,
              where:  "webhook_token IS NOT NULL",
              name:   "index_provider_connections_on_webhook_token"
  end
end
