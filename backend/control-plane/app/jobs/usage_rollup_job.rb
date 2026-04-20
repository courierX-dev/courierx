# frozen_string_literal: true

# UsageRollupJob
#
# Runs daily via Sidekiq-Cron (or manual trigger). Aggregates email_events
# from the previous day into usage_stats rows — one per tenant per provider,
# plus a combined row (provider = nil).
#
class UsageRollupJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(date_str = nil)
    date = date_str ? Date.parse(date_str) : Date.yesterday

    Tenant.find_each do |tenant|
      rollup_for_tenant(tenant, date)
    end
  end

  private

  def rollup_for_tenant(tenant, date)
    day_start = date.beginning_of_day
    day_end   = date.end_of_day

    emails = tenant.emails.where(created_at: day_start..day_end)

    # Two queries replace ~7 per-status COUNTs for the combined totals.
    status_counts = emails.group(:status).count
    event_counts  = emails
      .joins(:email_events)
      .where(email_events: { event_type: %w[opened clicked] })
      .group("email_events.event_type")
      .distinct
      .count("emails.id")

    totals = {
      emails_sent:       status_counts.values.sum,
      emails_delivered:  status_counts["delivered"].to_i,
      emails_bounced:    status_counts["bounced"].to_i,
      emails_complained: status_counts["complained"].to_i,
      emails_failed:     status_counts["failed"].to_i,
      emails_opened:     event_counts["opened"].to_i,
      emails_clicked:    event_counts["clicked"].to_i
    }

    UsageStat.find_or_initialize_by(tenant: tenant, date: date, provider: nil)
             .update!(totals)

    # Two queries replace N×7 per-provider COUNTs.
    provider_status = emails
      .joins(:provider_connection)
      .group("provider_connections.provider", "emails.status")
      .count

    provider_events = emails
      .joins(:provider_connection, :email_events)
      .where(email_events: { event_type: %w[opened clicked] })
      .group("provider_connections.provider", "email_events.event_type")
      .distinct
      .count("emails.id")

    tenant.provider_connections.pluck(:provider).uniq.each do |provider|
      sent = provider_status.select { |k, _| k[0] == provider }.values.sum

      provider_totals = {
        emails_sent:       sent,
        emails_delivered:  provider_status.fetch([provider, "delivered"], 0),
        emails_bounced:    provider_status.fetch([provider, "bounced"],    0),
        emails_complained: provider_status.fetch([provider, "complained"], 0),
        emails_failed:     provider_status.fetch([provider, "failed"],     0),
        emails_opened:     provider_events.fetch([provider, "opened"],     0),
        emails_clicked:    provider_events.fetch([provider, "clicked"],    0)
      }

      UsageStat.find_or_initialize_by(tenant: tenant, date: date, provider: provider)
               .update!(provider_totals)
    end
  end
end
