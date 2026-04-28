# frozen_string_literal: true

# ProviderQuotaIntrospectionJob
#
# Periodically refreshes ProviderQuota rows by hitting each provider's own
# account API for the real plan caps. Without this, caps are seeded once
# from ProviderQuotaTemplate (free-tier guesses) and never updated when a
# tenant upgrades — cap-aware routing would keep filtering them out as if
# they were still on free.
#
# Runs over active connections only. Per-connection failures are isolated so
# one provider's flaky API doesn't stop the rest. Skips (no introspection
# endpoint, auth failure, plan doesn't expose limits) leave the existing
# quota row untouched and bump `last_introspected_at` so we can tell the
# difference between "never tried" and "tried, didn't get a cap".
#
# Recommended cadence: hourly. Caps don't change often, but we want fresh
# enough data that a tenant who just upgraded sees their new headroom in
# under an hour without manual intervention.
class ProviderQuotaIntrospectionJob
  include Sidekiq::Job

  sidekiq_options queue: :low, retry: 1

  INTROSPECTABLE_PROVIDERS = %w[sendgrid mailgun aws_ses postmark brevo].freeze

  # No args → sweep every active connection. Pass a connection_id to refresh
  # one (e.g. immediately after credential rotation or a status change).
  def perform(connection_id = nil)
    scope = ProviderConnection.where(status: %w[active degraded])
                              .where(provider: INTROSPECTABLE_PROVIDERS)
    scope = scope.where(id: connection_id) if connection_id

    scope.find_each { |pc| introspect_one(pc) }
  end

  private

  def introspect_one(pc)
    quota  = pc.provider_quota || ProviderQuotaTemplate.seed!(pc)
    result = ProviderQuotaIntrospector.call(pc)

    if result.ok?
      quota.update!(
        daily_cap:            result.daily_cap.presence || quota.daily_cap,
        monthly_cap:          result.monthly_cap.presence || quota.monthly_cap,
        cap_source:           "api_introspected",
        last_introspected_at: Time.current
      )
      Rails.logger.info(
        "[QuotaIntrospect] connection=#{pc.id} provider=#{pc.provider} " \
        "daily=#{quota.daily_cap.inspect} monthly=#{quota.monthly_cap.inspect} (#{result.detail})"
      )
    else
      # Bump timestamp even on skip so the dashboard can show "last checked X
      # ago" without confusing it with success.
      quota.update_columns(last_introspected_at: Time.current)
      Rails.logger.info(
        "[QuotaIntrospect] connection=#{pc.id} provider=#{pc.provider} skipped: #{result.detail}"
      )
    end
  rescue => e
    # Keep the sweep going on per-connection failures. Sidekiq retry on the
    # whole job is wasteful when 19/20 connections succeeded.
    Rails.logger.error(
      "[QuotaIntrospect] connection=#{pc.id} provider=#{pc.provider} crashed: " \
      "#{e.class} #{e.message}"
    )
  end
end
