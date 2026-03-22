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

    totals = {
      emails_sent:       emails.count,
      emails_delivered:  emails.where(status: "delivered").count,
      emails_bounced:    emails.where(status: "bounced").count,
      emails_complained: emails.where(status: "complained").count,
      emails_failed:     emails.where(status: "failed").count,
      emails_opened:     emails.joins(:email_events).where(email_events: { event_type: "opened" }).distinct.count,
      emails_clicked:    emails.joins(:email_events).where(email_events: { event_type: "clicked" }).distinct.count
    }

    # Upsert combined stats (provider = nil)
    UsageStat.find_or_initialize_by(tenant: tenant, date: date, provider: nil)
             .update!(totals)

    # Per-provider breakdown
    tenant.provider_connections.pluck(:provider).uniq.each do |provider|
      provider_emails = emails.joins(:provider_connection)
                              .where(provider_connections: { provider: provider })

      provider_totals = {
        emails_sent:       provider_emails.count,
        emails_delivered:  provider_emails.where(status: "delivered").count,
        emails_bounced:    provider_emails.where(status: "bounced").count,
        emails_complained: provider_emails.where(status: "complained").count,
        emails_failed:     provider_emails.where(status: "failed").count,
        emails_opened:     provider_emails.joins(:email_events).where(email_events: { event_type: "opened" }).distinct.count,
        emails_clicked:    provider_emails.joins(:email_events).where(email_events: { event_type: "clicked" }).distinct.count
      }

      UsageStat.find_or_initialize_by(tenant: tenant, date: date, provider: provider)
               .update!(provider_totals)
    end
  end
end
