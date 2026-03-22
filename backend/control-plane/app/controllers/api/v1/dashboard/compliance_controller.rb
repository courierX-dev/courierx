# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      class ComplianceController < Api::V1::BaseController
        def index
          domains = @current_tenant.domains
          
          pass_dkim  = domains.any? { |d| d.dkim_public_key.present? }
          pass_spf   = domains.any? { |d| d.spf_record.present? }
          warn_dmarc = domains.any? { |d| d.dmarc_policy.present? }

          # Hardcoded platform defaults + real domain checks
          checks = [
            {
              label: "DKIM configured",
              description: "At least one sending domain has DKIM records published.",
              status: pass_dkim ? "pass" : "fail"
            },
            {
              label: "SPF record present",
              description: "Your sending domain has a valid SPF TXT record.",
              status: pass_spf ? "pass" : "fail"
            },
            {
              label: "DMARC policy",
              description: "DMARC is partially configured. Set policy to quarantine or reject.",
              status: warn_dmarc ? "pass" : "warn"
            },
            {
              label: "Tracking domain",
              description: "Custom tracking domain verified for open/click tracking.",
              status: "fail" # Stubbed as mock data was fail
            },
            {
              label: "Bounce processing",
              description: "Bounced emails are automatically suppressed.",
              status: "pass"
            },
            {
              label: "Unsubscribe header",
              description: "List-Unsubscribe headers are added to outbound messages.",
              status: "pass"
            },
            {
              label: "Complaint handling",
              description: "Spam complaints trigger automatic suppression.",
              status: "pass"
            }
          ]

          # Trust Score (starts at 30, max 100)
          score = 30
          score += 20 if pass_dkim
          score += 20 if pass_spf
          score += 10 if warn_dmarc
          score += 20 # Platform baselines

          render json: {
            trust_score: score,
            checks: checks,
            domains: domains.map do |d|
              {
                id: d.id,
                domain: d.domain,
                type: "sending",
                dkim: d.dkim_public_key.present?,
                spf: d.spf_record.present?,
                dmarc: d.dmarc_policy.present?
              }
            end
          }
        end
      end
    end
  end
end
