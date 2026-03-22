class CreateWebhookEndpoints < ActiveRecord::Migration[7.1]
  def change
    create_table :webhook_endpoints, id: :uuid do |t|
      t.references :tenant,      null: false, foreign_key: true, type: :uuid
      t.string     :url,         null: false
      t.string     :description
      t.string     :secret,      null: false
      t.boolean    :is_active,   null: false, default: true
      t.string     :events,      array: true, default: []

      t.timestamps
    end

    add_index :webhook_endpoints, [:tenant_id, :is_active]
  end
end
