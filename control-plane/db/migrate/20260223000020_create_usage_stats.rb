class CreateUsageStats < ActiveRecord::Migration[7.1]
  def change
    create_table :usage_stats, id: :uuid do |t|
      t.references :tenant,   null: false, foreign_key: true, type: :uuid
      t.date       :date,     null: false
      t.string     :provider

      t.integer    :emails_sent,       null: false, default: 0
      t.integer    :emails_delivered,  null: false, default: 0
      t.integer    :emails_bounced,    null: false, default: 0
      t.integer    :emails_complained, null: false, default: 0
      t.integer    :emails_failed,     null: false, default: 0
      t.integer    :emails_opened,     null: false, default: 0
      t.integer    :emails_clicked,    null: false, default: 0

      t.timestamps
    end

    add_index :usage_stats, [:tenant_id, :date, :provider],
              unique: true, name: "idx_usage_stats_tenant_date_provider"
    add_index :usage_stats, [:tenant_id, :date]
  end
end
