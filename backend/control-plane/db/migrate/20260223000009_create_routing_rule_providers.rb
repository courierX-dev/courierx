class CreateRoutingRuleProviders < ActiveRecord::Migration[7.1]
  def change
    create_table :routing_rule_providers, id: :uuid do |t|
      t.references :routing_rule,        null: false, foreign_key: true, type: :uuid
      t.references :provider_connection, null: false, foreign_key: true, type: :uuid
      t.integer    :priority,            null: false, default: 1
      t.integer    :weight,              null: false, default: 100
      t.boolean    :failover_only,       null: false, default: false

      t.timestamps
    end

    add_index :routing_rule_providers, [:routing_rule_id, :provider_connection_id],
              unique: true, name: "idx_rrp_rule_provider"
  end
end
