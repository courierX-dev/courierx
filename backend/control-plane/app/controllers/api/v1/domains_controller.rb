# frozen_string_literal: true

module Api
  module V1
    class DomainsController < BaseController
      before_action :set_domain, only: [:show, :destroy, :verify]

      def index
        domains = current_tenant.domains.order(created_at: :desc)
        render json: domains.map { |d| domain_json(d) }
      end

      def show
        render json: domain_json(@domain)
      end

      def create
        domain = current_tenant.domains.build(domain_params)
        if domain.save
          render json: domain_json(domain), status: :created
        else
          render json: { errors: domain.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def verify
        @domain.verify!
        render json: domain_json(@domain)
      end

      def destroy
        @domain.destroy!
        head :no_content
      end

      private

      def set_domain
        @domain = current_tenant.domains.find(params[:id])
      end

      def domain_params
        params.permit(:domain)
      end

      def domain_json(d)
        {
          id: d.id, domain: d.domain, status: d.status,
          verification_token: d.verification_token, verified_at: d.verified_at,
          spf_record: d.spf_record, dkim_selector: d.dkim_selector,
          created_at: d.created_at
        }
      end
    end
  end
end
