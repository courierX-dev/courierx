class CreateProviderConnections < ActiveRecord::Migration[7.1]
  def change
    create_table :provider_connections, id: :uuid do |t|
      t.references :tenant,              null: false, foreign_key: true, type: :uuid
      t.references :managed_sub_account, foreign_key: true, type: :uuid
      t.string     :provider,            null: false
      t.string     :mode,                null: false
      t.string     :status,              null: false, default: "active"
      t.string     :display_name
      t.string     :encrypted_api_key
      t.string     :encrypted_api_key_iv
      t.string     :encrypted_secret
      t.string     :encrypted_secret_iv
      t.string     :region
      t.string     :smtp_host
      t.integer    :smtp_port
      t.integer    :weight,              null: false, default: 100
      t.integer    :priority,            null: false, default: 1
      t.datetime   :last_health_check_at
      t.float      :success_rate
      t.integer    :avg_latency_ms
      t.integer    :consecutive_failures, null: false, default: 0

      t.timestamps
    end

    add_index :provider_connections, [:tenant_id, :provider, :mode], unique: true
    add_index :provider_connections, [:tenant_id, :status]
  end
end
