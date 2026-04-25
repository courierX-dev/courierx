class ProviderQuota < ApplicationRecord
  # Rails' default inflector treats "quota" as uncountable, so without this
  # the table name is mis-inferred as "provider_quota" (singular). The
  # initializer in config/initializers/inflections.rb fixes the global rule;
  # this is a belt-and-suspenders override.
  self.table_name = "provider_quotas"

  RESET_STRATEGIES = %w[rolling_24h calendar_day_utc calendar_month_utc billing_cycle].freeze
  CAP_SOURCES      = %w[manual provider_template api_introspected].freeze

  belongs_to :provider_connection

  validates :reset_strategy, inclusion: { in: RESET_STRATEGIES }
  validates :cap_source,     inclusion: { in: CAP_SOURCES }
  validates :warn_at_pct,    numericality: { in: 0..100 }
  validates :daily_cap,   numericality: { greater_than: 0 }, allow_nil: true
  validates :monthly_cap, numericality: { greater_than: 0 }, allow_nil: true

  # Does this connection have headroom to send `count` more messages right now?
  # nil cap = "unlimited / not tracked" — passes through.
  def has_headroom?(count: 1)
    return true if daily_cap.nil? && monthly_cap.nil?

    daily_ok   = daily_cap.nil?   || (daily_cap   - usage_for(:day))   >= count
    monthly_ok = monthly_cap.nil? || (monthly_cap - usage_for(:month)) >= count
    daily_ok && monthly_ok
  end

  def usage_for(period)
    period_start = period.to_sym == :day ? Time.now.utc.beginning_of_day : Time.now.utc.beginning_of_month
    ProviderQuotaUsage.where(
      provider_connection_id: provider_connection_id,
      period:                 period.to_s,
      period_start:           period_start
    ).sum(:count)
  end
end
