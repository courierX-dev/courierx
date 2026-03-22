# frozen_string_literal: true

module Api
  module V1
    class DashboardController < BaseController
      # GET /api/v1/dashboard/metrics?period=7d|30d|90d
      def metrics
        tenant = current_tenant
        today  = Date.current

        days = { "7d" => 7, "30d" => 30, "90d" => 90 }.fetch(params[:period], 7)
        from = today - days

        stats = UsageStat.for_period(tenant.id, from: from, to: today)

        # Totals for the period
        totals = {
          sent:       stats.sum(&:emails_sent),
          delivered:  stats.sum(&:emails_delivered),
          bounced:    stats.sum(&:emails_bounced),
          complained: stats.sum(&:emails_complained),
          failed:     stats.sum(&:emails_failed),
          opened:     stats.sum(&:emails_opened),
          clicked:    stats.sum(&:emails_clicked)
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
          daily: stats.map { |s|
            {
              date: s.date.iso8601,
              sent: s.emails_sent,
              delivered: s.emails_delivered,
              bounced: s.emails_bounced,
              opened: s.emails_opened
            }
          },
          providers: current_tenant.provider_connections.active.map { |pc|
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
