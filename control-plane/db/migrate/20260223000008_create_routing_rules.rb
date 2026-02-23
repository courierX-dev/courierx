class CreateRoutingRules < ActiveRecord::Migration[7.1]
  def change
    create_table :routing_rules, id: :uuid do |t|
      t.references :tenant,    null: false, foreign_key: true, type: :uuid
      t.string     :name,      null: false
      t.string     :strategy,  null: false, default: "priority"
      t.boolean    :is_default, null: false, default: false
      t.boolean    :is_active,  null: false, default: true
      t.string     :match_from_domain
      t.string     :match_tag

      t.timestamps
    end

    add_index :routing_rules, [:tenant_id, :is_default]
    add_index :routing_rules, [:tenant_id, :is_active]
  end
end
