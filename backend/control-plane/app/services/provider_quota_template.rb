# frozen_string_literal: true

# ProviderQuotaTemplate
#
# Best-known free-tier limits per provider. Used to seed a sensible default
# ProviderQuota row when a tenant connects a new provider, so cap-aware
# routing has something to filter on before a tenant manually adjusts.
#
# Updated when providers change their public free-tier numbers — keep this
# the single source of truth so we don't sprinkle "100 per day" magic
# numbers around the codebase.
#
# When `daily_cap` / `monthly_cap` is nil, no cap is tracked (treated as
# unlimited). SMTP has no concept of a provider-side cap — the user sets
# their own limit if they want one.
class ProviderQuotaTemplate
  DEFAULTS = {
    "resend"   => { daily_cap: 100,  monthly_cap: 3_000,  reset_strategy: "calendar_day_utc" },
    "sendgrid" => { daily_cap: 100,  monthly_cap: nil,    reset_strategy: "calendar_day_utc" },
    "postmark" => { daily_cap: nil,  monthly_cap: 100,    reset_strategy: "calendar_month_utc" },  # trial
    "aws_ses"  => { daily_cap: 200,  monthly_cap: nil,    reset_strategy: "rolling_24h" },         # sandbox
    "mailgun"  => { daily_cap: 100,  monthly_cap: nil,    reset_strategy: "calendar_day_utc" },   # trial
    "brevo"    => { daily_cap: 300,  monthly_cap: nil,    reset_strategy: "calendar_day_utc" },
    "smtp"     => { daily_cap: nil,  monthly_cap: nil,    reset_strategy: "calendar_day_utc" },   # no cap
  }.freeze

  def self.for(provider)
    DEFAULTS[provider.to_s] || DEFAULTS["smtp"]
  end

  # Idempotent — does nothing if the connection already has a quota row.
  # Use after creating a ProviderConnection so the resolver's cap-headroom
  # filter has something to work with.
  def self.seed!(provider_connection)
    return provider_connection.provider_quota if provider_connection.provider_quota

    template = self.for(provider_connection.provider)
    ProviderQuota.create!(
      provider_connection: provider_connection,
      daily_cap:           template[:daily_cap],
      monthly_cap:         template[:monthly_cap],
      reset_strategy:      template[:reset_strategy],
      cap_source:          "provider_template"
    )
  end
end
