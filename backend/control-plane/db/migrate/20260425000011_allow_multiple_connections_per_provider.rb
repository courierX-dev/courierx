class AllowMultipleConnectionsPerProvider < ActiveRecord::Migration[8.1]
  # Multi-account is first-class now: a tenant can have several Resend
  # connections (e.g. one per project). Uniqueness moves from
  # (tenant, provider, mode) to include display_name so accounts coexist
  # as long as they're named differently.
  def up
    # display_name is required by the model; backfill any nulls before
    # we tighten the column.
    execute <<~SQL.squish
      UPDATE provider_connections
      SET display_name = INITCAP(provider) || ' (' || mode || ')'
      WHERE display_name IS NULL OR display_name = '';
    SQL

    change_column_null :provider_connections, :display_name, false

    remove_index :provider_connections,
                 name: "index_provider_connections_on_tenant_id_and_provider_and_mode"

    add_index :provider_connections,
              [:tenant_id, :provider, :mode, :display_name],
              unique: true,
              name: "idx_provider_connections_unique_per_account"
  end

  def down
    remove_index :provider_connections, name: "idx_provider_connections_unique_per_account"

    add_index :provider_connections,
              [:tenant_id, :provider, :mode],
              unique: true,
              name: "index_provider_connections_on_tenant_id_and_provider_and_mode"

    change_column_null :provider_connections, :display_name, true
  end
end
