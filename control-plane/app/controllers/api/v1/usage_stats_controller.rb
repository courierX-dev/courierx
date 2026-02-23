# frozen_string_literal: true

module Api
  module V1
    class UsageStatsController < BaseController
      def index
        from = params[:from] ? Date.parse(params[:from]) : 7.days.ago.to_date
        to   = params[:to]   ? Date.parse(params[:to])   : Date.current

        stats = UsageStat.for_period(current_tenant.id, from: from, to: to)
        render json: stats.map { |s|
          {
            date: s.date.iso8601,
            provider: s.provider,
            sent: s.emails_sent, delivered: s.emails_delivered,
            bounced: s.emails_bounced, complained: s.emails_complained,
            failed: s.emails_failed, opened: s.emails_opened, clicked: s.emails_clicked
          }
        }
      end
    end
  end
end
