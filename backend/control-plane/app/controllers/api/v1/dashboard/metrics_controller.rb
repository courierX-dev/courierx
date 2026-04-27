# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      class MetricsController < Api::V1::BaseController
        # GET /api/v1/dashboard/metrics?period=7d|30d|90d
        #
        # Aggregates live from `emails` + `email_events` so the dashboard
        # reflects sends made today. (UsageStat rollups are written daily
        # by UsageRollupJob and would otherwise lag by 24h, or be missing
        # entirely in environments without a scheduled cron.)
        def index
          tenant = current_tenant
          today  = Date.current

          days = { "7d" => 7, "30d" => 30, "90d" => 90 }.fetch(params[:period], 7)
          from = today - days

          range = from.beginning_of_day..today.end_of_day
          emails = tenant.emails.where(created_at: range)

          status_by_date = emails
            .group("DATE(created_at)", :status)
            .count

          events_by_date = emails
            .joins(:email_events)
            .where(email_events: { event_type: %w[opened clicked] })
            .group("DATE(emails.created_at)", "email_events.event_type")
            .distinct
            .count("emails.id")

          daily = (from..today).map do |date|
            day_statuses = status_by_date.select { |(d, _), _| d.to_date == date }
            sent      = day_statuses.values.sum
            delivered = day_statuses.fetch([date, "delivered"], 0)
            bounced   = day_statuses.fetch([date, "bounced"],   0)
            opened    = events_by_date.fetch([date, "opened"],  0)
            clicked   = events_by_date.fetch([date, "clicked"], 0)

            {
              date:      date.iso8601,
              sent:      sent,
              delivered: delivered,
              bounced:   bounced,
              opened:    opened,
              clicked:   clicked
            }
          end

          totals = {
            sent:       daily.sum { |d| d[:sent] },
            delivered:  daily.sum { |d| d[:delivered] },
            bounced:    daily.sum { |d| d[:bounced] },
            complained: status_by_date.select { |(_, s), _| s == "complained" }.values.sum,
            failed:     status_by_date.select { |(_, s), _| s == "failed" }.values.sum,
            opened:     daily.sum { |d| d[:opened] },
            clicked:    daily.sum { |d| d[:clicked] }
          }

          delivery_rate = totals[:sent] > 0 ? (totals[:delivered].to_f / totals[:sent] * 100).round(2) : 0
          open_rate     = totals[:delivered] > 0 ? (totals[:opened].to_f / totals[:delivered] * 100).round(2) : 0

          render json: {
            period: { from: from.iso8601, to: today.iso8601 },
            totals: totals,
            rates: {
              delivery_rate: delivery_rate,
              open_rate: open_rate
            },
            daily: daily,
            tracking_coverage: tracking_coverage(emails),
            providers: tenant.provider_connections.active.map { |pc|
              {
                id: pc.id,
                provider: pc.provider,
                display_name: pc.display_name,
                status: pc.status,
                success_rate: pc.success_rate,
                avg_latency_ms: pc.avg_latency_ms
              }
            }
          }
        end

        private

        # tracking_coverage breaks down opens/clicks by which source detected
        # them. With both first-party (provider="courierx") and provider-native
        # webhook events stored in email_events, a single open can produce two
        # rows per email_id. We surface three buckets per event_type:
        #
        #   first_party_only — only our pixel/redirector saw it (provider's
        #                      tracking was off, blocked, or unsupported)
        #   provider_only    — only the provider webhook saw it (recipient
        #                      hit "show images" after our token expired,
        #                      or our rewriter was disabled for that send)
        #   both             — both sources saw it (the healthy state)
        #
        # The aggregate `opened` total in `totals` already dedupes by email_id
        # (.distinct.count("emails.id")) — this just splits that total by source.
        def tracking_coverage(emails)
          rows = emails
            .joins(:email_events)
            .where(email_events: { event_type: %w[opened clicked] })
            .group("emails.id", "email_events.event_type")
            .pluck(
              "email_events.event_type",
              Arel.sql("BOOL_OR(email_events.provider = 'courierx') AS has_first_party"),
              Arel.sql("BOOL_OR(email_events.provider <> 'courierx') AS has_provider")
            )

          %w[opened clicked].each_with_object({}) do |event_type, acc|
            buckets = { first_party_only: 0, provider_only: 0, both: 0 }
            rows.each do |type, has_first_party, has_provider|
              next unless type == event_type
              if has_first_party && has_provider
                buckets[:both] += 1
              elsif has_first_party
                buckets[:first_party_only] += 1
              elsif has_provider
                buckets[:provider_only] += 1
              end
            end
            acc[event_type] = buckets
          end
        end
      end
    end
  end
end
