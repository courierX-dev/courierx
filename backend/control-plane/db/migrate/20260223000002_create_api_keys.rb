class CreateApiKeys < ActiveRecord::Migration[7.1]
  def change
    create_table :api_keys, id: :uuid do |t|
      t.references :tenant,     null: false, foreign_key: true, type: :uuid
      t.string     :name,       null: false
      t.string     :key_hash,   null: false
      t.string     :key_prefix, null: false
      t.string     :status,     null: false, default: "active"
      t.string     :scopes,     array: true, default: []
      t.datetime   :last_used_at
      t.datetime   :expires_at

      t.timestamps
    end

    add_index :api_keys, :key_hash, unique: true
    add_index :api_keys, [:tenant_id, :status]
  end
end
