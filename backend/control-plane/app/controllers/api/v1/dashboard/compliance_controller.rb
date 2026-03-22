# frozen_string_literal: true

module Api
  module V1
    module Dashboard
      class ComplianceController < Api::V1::BaseController
        def index
          domains = @current_tenant.domains
          has_provider = @current_tenant.provider_connections.exists?

          pass_dkim  = domains.any? { |d| d.dkim_public_key.present? }
          pass_spf   = domains.any? { |d| d.spf_record.present? }
          pass_dmarc = domains.any? { |d| d.dmarc_policy.present? && d.dmarc_policy.match?(/quarantine|reject/i) }
          warn_dmarc = !pass_dmarc && domains.any? { |d| d.dmarc_policy.present? }
          has_bounces_suppressed  = @current_tenant.suppressions.bounces.exists?
          has_complaints_suppressed = @current_tenant.suppressions.complaints.exists?
          has_webhooks = @current_tenant.webhook_endpoints.exists?

          checks = [
            {
              label: "DKIM configured",
              description: pass_dkim ? "At least one sending domain has DKIM records published." : "No sending domains have DKIM records. Add DKIM DNS records to your domain.",
              status: pass_dkim ? "pass" : "fail"
            },
            {
              label: "SPF record present",
              description: pass_spf ? "Your sending domain has a valid SPF TXT record." : "No SPF records found. Add an SPF TXT record to your sending domain.",
              status: pass_spf ? "pass" : "fail"
            },
            {
              label: "DMARC policy",
              description: pass_dmarc ? "DMARC policy is set to quarantine or reject." : (warn_dmarc ? "DMARC is configured but set to 'none'. Set policy to quarantine or reject." : "No DMARC policy found. Add a DMARC TXT record to your domain."),
              status: pass_dmarc ? "pass" : (warn_dmarc ? "warn" : "fail")
            },
            {
              label: "Provider connected",
              description: has_provider ? "At least one email provider is connected." : "No providers connected. Connect a provider to start sending.",
              status: has_provider ? "pass" : "fail"
            },
            {
              label: "Bounce processing",
              description: has_bounces_suppressed ? "Bounced addresses are being suppressed." : "No bounce suppressions recorded yet. Bounces will be suppressed automatically once you start sending.",
              status: has_bounces_suppressed ? "pass" : "warn"
            },
            {
              label: "Webhook endpoint",
              description: has_webhooks ? "Webhook endpoint configured to receive delivery events." : "No webhook endpoints configured. Add a webhook to receive bounce and complaint notifications.",
              status: has_webhooks ? "pass" : "warn"
            },
            {
              label: "Complaint handling",
              description: has_complaints_suppressed ? "Spam complaints are being suppressed." : "No complaint suppressions recorded yet. Complaints will be suppressed automatically once reported.",
              status: has_complaints_suppressed ? "pass" : "warn"
            }
          ]

          passed = checks.count { |c| c[:status] == "pass" }
          total  = checks.size
          score  = ((passed.to_f / total) * 100).round

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
