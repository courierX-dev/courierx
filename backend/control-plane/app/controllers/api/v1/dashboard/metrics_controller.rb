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
      end
    end
  end
end
