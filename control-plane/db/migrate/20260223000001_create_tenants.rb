class CreateTenants < ActiveRecord::Migration[7.1]
  def change
    create_table :tenants, id: :uuid do |t|
      t.string :name,     null: false
      t.string :slug,     null: false
      t.string :email,    null: false
      t.string :mode,     null: false, default: "demo"
      t.string :status,   null: false, default: "active"
      t.string :plan_id
      t.jsonb  :settings, null: false, default: {}

      t.timestamps
    end

    add_index :tenants, :slug,   unique: true
    add_index :tenants, :email,  unique: true
    add_index :tenants, :status
  end
end
