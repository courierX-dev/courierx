# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      class BillingController < Api::V1::BaseController
        def index
          render json: {
            plan: @current_tenant.plan,
            plan_email_limit: @current_tenant.plan_email_limit,
            current_period_ends_at: @current_tenant.current_period_ends_at,
            usage: {
              used: emails_sent_this_month,
              limit: @current_tenant.plan_email_limit || 100
            },
            # Hardcoded invoices to match UI (until external provider sync is added)
            invoices: [
              { id: "inv_1", date: "Feb 1, 2025", amount: "$79.00", status: "paid" },
              { id: "inv_2", date: "Jan 1, 2025", amount: "$79.00", status: "paid" },
              { id: "inv_3", date: "Dec 1, 2024", amount: "$79.00", status: "paid" },
              { id: "inv_4", date: "Nov 1, 2024", amount: "$79.00", status: "paid" }
            ]
          }
        end

        private

        def emails_sent_this_month
          start_of_month = Time.current.beginning_of_month.to_date
          @current_tenant.usage_stats.where("date >= ?", start_of_month).sum(:emails_sent)
        end
      end
    end
  end
end
