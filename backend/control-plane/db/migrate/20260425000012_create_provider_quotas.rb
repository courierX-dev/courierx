class CreateProviderQuotas < ActiveRecord::Migration[8.1]
  # Cap-aware routing: each ProviderConnection has a quota record describing
  # daily/monthly limits + how to track them. Numbers come from the provider's
  # API where possible (api_introspected), our defaults for the free tier
  # (provider_template), or the user (manual).
  #
  # Usage is bucketed in provider_quota_usages with one row per
  # (connection, period, period_start) — incremented atomically per send,
  # rolled up by the introspection job from the provider's true counters.
  def change
    create_table :provider_quotas, id: :uuid do |t|
      t.references :provider_connection, null: false, foreign_key: true,
                   type: :uuid, index: { unique: true }

      t.integer  :daily_cap
      t.integer  :monthly_cap
      t.string   :reset_strategy,       null: false, default: "rolling_24h"
      t.string   :cap_source,           null: false, default: "manual"
      t.integer  :warn_at_pct,          null: false, default: 80
      t.datetime :last_introspected_at
      t.datetime :next_reset_at

      t.timestamps
    end

    create_table :provider_quota_usages, id: :uuid do |t|
      t.references :provider_connection, null: false, foreign_key: true, type: :uuid

      t.string   :period,       null: false
      t.datetime :period_start, null: false
      t.integer  :count,        null: false, default: 0

      t.timestamps
    end

    add_index :provider_quota_usages,
              [:provider_connection_id, :period, :period_start],
              unique: true,
              name: "idx_pqu_unique_bucket"
  end
end
