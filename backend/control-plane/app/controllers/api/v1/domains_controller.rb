# frozen_string_literal: true

module Api
  module V1
    class DomainsController < BaseController
      before_action :set_domain, only: [:show, :update, :destroy, :verify, :recheck]

      def index
        domains = current_tenant.domains
                                .includes(domain_provider_verifications: :provider_connection)
                                .order(created_at: :desc)
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

      # Re-poll every per-(domain × provider) verification immediately, instead
      # of waiting for the next scheduled poll. Used by the dashboard's
      # "Re-check" button after the user adds DNS records at their provider.
      def recheck
        DomainProviderPollJob.perform_async(@domain.id)
        render json: { message: "Re-check started" }, status: :accepted
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

        # Ownership record is verified once the domain itself rolls up to verified
        # (any DPV verifying flips the domain in DomainProviderPollJob).
        ownership_record = {
          type:     "TXT",
          name:     "_courierx-verification.#{d.domain}",
          value:    "courierx-verify=#{d.verification_token}",
          ttl:      3600,
          verified: d.status == "verified"
        }

        # Per-provider records inherit the verified flag from their source DPV.
        # When the same record is contributed by multiple providers (common for
        # SPF includes), it counts as verified if ANY contributor verified it.
        provider_records = dpvs.flat_map do |dpv|
          dpv.records.map { |r| r.symbolize_keys.merge(verified: dpv.status == "verified") }
        end

        unified = (provider_records + [ownership_record])
                    .group_by { |r| [r[:type], r[:name], r[:value]] }
                    .map { |_, group| group.first.merge(verified: group.any? { |r| r[:verified] }) }

        # Pin ownership first so it sits at the top of the modal regardless of
        # provider record ordering.
        unified = unified.partition { |r| r[:name] == ownership_record[:name] }.flatten(1)

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
            conn = dpv.provider_connection
            {
              # `provider_connection_id` and `display_name` distinguish two
              # connections of the same provider type ("Resend Production" vs
              # "Resend Marketing") in the multi-account world.
              provider_connection_id: dpv.provider_connection_id,
              provider:               dpv.provider,
              display_name:           conn&.display_name,
              priority:               conn&.priority,
              status:                 dpv.status,
              verified_at:            dpv.verified_at,
              last_checked_at:        dpv.last_checked_at,
              error:                  dpv.error,
              external_domain_id:     dpv.external_domain_id
            }
          }.sort_by { |p| [p[:priority] || Float::INFINITY, p[:display_name] || ""] }
        }
      end
    end
  end
end
