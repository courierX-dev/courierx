class ScopeDomainProviderVerificationsToConnections < ActiveRecord::Migration[8.1]
  # A DomainProviderVerification is a claim that "this domain is verified on
  # this specific provider account" — not just "this provider type". With
  # multi-account first-class (e.g. two Resend connections per tenant), the
  # row must reference the connection, not the provider string.
  def up
    add_reference :domain_provider_verifications, :provider_connection,
                  type: :uuid, foreign_key: true, index: false, null: true

    # Backfill: the old design assumed one connection per (tenant, provider),
    # so each existing DPV row maps to exactly one connection. Match by tenant
    # (via the domain) + provider type.
    execute <<~SQL.squish
      UPDATE domain_provider_verifications dpv
      SET provider_connection_id = pc.id
      FROM domains d, provider_connections pc
      WHERE dpv.domain_id          = d.id
        AND pc.tenant_id           = d.tenant_id
        AND pc.provider            = dpv.provider
        AND dpv.provider_connection_id IS NULL;
    SQL

    # Anything we couldn't match is orphaned (the connection was deleted).
    execute "DELETE FROM domain_provider_verifications WHERE provider_connection_id IS NULL"

    change_column_null :domain_provider_verifications, :provider_connection_id, false

    remove_index :domain_provider_verifications,
                 name: "index_domain_provider_verifications_on_domain_id_and_provider"

    add_index :domain_provider_verifications,
              [:domain_id, :provider_connection_id],
              unique: true,
              name: "idx_dpv_on_domain_and_connection"

    add_index :domain_provider_verifications, :provider_connection_id,
              name: "index_dpv_on_provider_connection_id"
  end

  def down
    remove_index :domain_provider_verifications, name: "idx_dpv_on_domain_and_connection"
    remove_index :domain_provider_verifications, name: "index_dpv_on_provider_connection_id"

    add_index :domain_provider_verifications, [:domain_id, :provider],
              unique: true,
              name: "index_domain_provider_verifications_on_domain_id_and_provider"

    remove_reference :domain_provider_verifications, :provider_connection, foreign_key: true
  end
end
