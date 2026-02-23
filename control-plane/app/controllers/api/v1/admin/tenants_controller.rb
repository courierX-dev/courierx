# frozen_string_literal: true

module Api
  module V1
    module Admin
      class TenantsController < BaseController
        def index
          tenants = Tenant.order(created_at: :desc)

          if params[:status].present?
            tenants = tenants.where(status: params[:status])
          end

          if params[:plan].present?
            tenants = tenants.where(plan: params[:plan])
          end

          render json: paginate(tenants)
        end

        def show
          tenant = Tenant.find(params[:id])

          # Include basic stats for the admin
          stats = {
            emails_sent_7d:  tenant.usage_stats.where("date >= ?", 7.days.ago.to_date).sum(:sent),
            api_keys_count:  tenant.api_keys.count,
            providers_count: tenant.provider_connections.count,
            domains_count:   tenant.domains.count
          }

          render json: tenant.as_json.merge(stats: stats)
        end

        def update
          tenant = Tenant.find(params[:id])

          if tenant.update(tenant_params)
            render json: tenant
          else
            unprocessable(tenant)
          end
        end

        private

        def tenant_params
          # Super admins can update these critical fields
          params.permit(:plan, :plan_email_limit, :status, :mode, :current_period_ends_at)
        end
      end
    end
  end
end
