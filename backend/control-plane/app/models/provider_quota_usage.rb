class ProviderQuotaUsage < ApplicationRecord
  PERIODS = %w[day month].freeze

  belongs_to :provider_connection

  validates :period,       inclusion: { in: PERIODS }
  validates :period_start, presence: true
  validates :count,        numericality: { greater_than_or_equal_to: 0 }

  # Race-safe per-bucket counter. Two senders incrementing the same
  # (connection, day, today) row land at +2, never overwriting each other.
  def self.increment!(provider_connection_id:, period:, by: 1)
    period_start = period.to_s == "day" ? Time.now.utc.beginning_of_day : Time.now.utc.beginning_of_month

    connection.exec_query(
      <<~SQL.squish,
        INSERT INTO provider_quota_usages
          (id, provider_connection_id, period, period_start, count, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (provider_connection_id, period, period_start)
        DO UPDATE SET count = provider_quota_usages.count + EXCLUDED.count, updated_at = NOW()
      SQL
      "ProviderQuotaUsage Increment",
      [provider_connection_id, period.to_s, period_start, by]
    )
  end
end
