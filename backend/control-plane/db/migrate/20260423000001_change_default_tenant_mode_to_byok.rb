class ChangeDefaultTenantModeToByok < ActiveRecord::Migration[8.1]
  def up
    change_column_default :tenants, :mode, from: "demo", to: "byok"
  end

  def down
    change_column_default :tenants, :mode, from: "byok", to: "demo"
  end
end
