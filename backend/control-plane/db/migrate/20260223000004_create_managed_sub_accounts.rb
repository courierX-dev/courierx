class CreateManagedSubAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :managed_sub_accounts, id: :uuid do |t|
      t.string  :provider,              null: false
      t.string  :external_id,           null: false
      t.string  :encrypted_api_key,     null: false
      t.string  :encrypted_api_key_iv,  null: false
      t.string  :status,                null: false, default: "active"
      t.string  :region
      t.string  :dedicated_ips,         array: true, default: []
      t.string  :shared_pool_id
      t.integer :daily_limit
      t.integer :monthly_limit

      t.timestamps
    end

    add_index :managed_sub_accounts, [:provider, :external_id], unique: true
  end
end
