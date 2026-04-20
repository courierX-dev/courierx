# frozen_string_literal: true

module Api
  module V1
    class DomainsController < BaseController
      before_action :set_domain, only: [:show, :update, :destroy, :verify]

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
          DomainPropagationJob.perform_async(domain.id)
          render json: domain_json(domain), status: :created
        else
          render json: { errors: domain.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @domain.update(domain_update_params)
          render json: domain_json(@domain)
        else
          render json: { errors: @domain.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def verify
        @domain.update!(status: "pending_verification")
        DomainVerificationJob.perform_async(@domain.id)
        render json: { message: "Verification started" }, status: :accepted
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

      def domain_update_params
        params.permit(:dkim_selector)
      end

      def domain_json(d)
        dpvs = d.domain_provider_verifications.to_a

        # CourierX ownership record — proves the domain belongs to this tenant
        ownership_record = {
          type:  "TXT",
          name:  d.domain,
          value: "courierx-verify=#{d.verification_token}",
          ttl:   3600
        }

        # Merged DNS bundle: ownership + every provider's required records,
        # deduplicated on (type, name, value).
        all_records = [ownership_record] + dpvs.flat_map { |dpv| dpv.records.map(&:symbolize_keys) }
        unified = all_records.uniq { |r| [r[:type], r[:name], r[:value]] }

        {
          id:                 d.id,
          domain:             d.domain,
          status:             d.status,
          verification_token: d.verification_token,
          verified_at:        d.verified_at,
          spf_record:         d.spf_record,
          dkim_selector:      d.dkim_selector,
          created_at:         d.created_at,
          dns_records:        unified,
          providers:          dpvs.map { |dpv|
            {
              provider:           dpv.provider,
              status:             dpv.status,
              verified_at:        dpv.verified_at,
              last_checked_at:    dpv.last_checked_at,
              error:              dpv.error,
              external_domain_id: dpv.external_domain_id
            }
          }
        }
      end
    end
  end
end
