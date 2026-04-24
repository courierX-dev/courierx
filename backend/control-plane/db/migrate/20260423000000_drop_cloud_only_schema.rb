class DropCloudOnlySchema < ActiveRecord::Migration[8.1]
  # Removes billing/compliance/waitlist/managed_sub_account tables + columns
  # from the CORE database. These now live in the separate cloud service's
  # own database. Run the ETL at cloud/service/bin/import_from_core BEFORE
  # running this migration in production, or data is lost.
  def up
    remove_foreign_key :provider_connections, :managed_sub_accounts if foreign_key_exists?(:provider_connections, :managed_sub_accounts)
    if column_exists?(:provider_connections, :managed_sub_account_id)
      remove_index :provider_connections, name: "index_provider_connections_on_managed_sub_account_id" if index_exists?(:provider_connections, :managed_sub_account_id, name: "index_provider_connections_on_managed_sub_account_id")
      remove_column :provider_connections, :managed_sub_account_id
    end

    drop_table :waitlist_entries, if_exists: true
    drop_table :compliance_documents, if_exists: true
    drop_table :compliance_profiles, if_exists: true
    drop_table :managed_sub_accounts, if_exists: true

    %i[plan billing_provider billing_customer_id billing_subscription_id plan_email_limit].each do |col|
      remove_column :tenants, col if column_exists?(:tenants, col)
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "Cloud-only schema now lives in cloud/rails/migrations/. Run those migrations against the cloud database to recreate these tables."
  end
end
