class AddBillingToTenants < ActiveRecord::Migration[7.1]
  def change
    add_column :tenants, :plan, :string, null: false, default: "free"
    add_column :tenants, :billing_provider, :string
    add_column :tenants, :billing_customer_id, :string
    add_column :tenants, :billing_subscription_id, :string
    add_column :tenants, :plan_email_limit, :integer, default: 100
    add_column :tenants, :current_period_ends_at, :datetime

    add_index :tenants, :billing_customer_id, unique: true, where: "billing_customer_id IS NOT NULL"
    add_index :tenants, :billing_subscription_id, unique: true, where: "billing_subscription_id IS NOT NULL"
  end
end
