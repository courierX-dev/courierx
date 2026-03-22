class CreateRateLimitPolicies < ActiveRecord::Migration[7.1]
  def change
    create_table :rate_limit_policies, id: :uuid do |t|
      t.references :tenant,         null: false, foreign_key: true, type: :uuid, index: { unique: true }
      t.integer    :max_per_minute, null: false, default: 60
      t.integer    :max_per_hour,   null: false, default: 1_000
      t.integer    :max_per_day,    null: false, default: 10_000
      t.integer    :max_per_month,  null: false, default: 100_000
      t.boolean    :demo_restricted, null: false, default: false
      t.integer    :demo_max_total

      t.timestamps
    end
  end
end
