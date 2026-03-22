# frozen_string_literal: true

# SuppressionSyncJob
#
# Stub job — will pull bounces/complaints from provider APIs
# (SendGrid, SES, Mailgun) when BYOK credentials are configured.
# For now, logs and exits gracefully.
#
class SuppressionSyncJob
  include Sidekiq::Job

  sidekiq_options queue: :low, retry: 1

  def perform(tenant_id = nil)
    scope = tenant_id ? Tenant.where(id: tenant_id) : Tenant.all

    scope.find_each do |tenant|
      tenant.provider_connections.active.where(mode: "byok").each do |pc|
        sync_provider(tenant, pc)
      end
    end
  end

  private

  def sync_provider(tenant, pc)
    case pc.provider
    when "sendgrid"
      # TODO: GET https://api.sendgrid.com/v3/suppression/bounces
      Rails.logger.info("[SuppressionSync] SendGrid sync pending for #{tenant.name}")
    when "mailgun"
      # TODO: GET https://api.mailgun.net/v3/{domain}/bounces
      Rails.logger.info("[SuppressionSync] Mailgun sync pending for #{tenant.name}")
    when "aws_ses"
      # TODO: Pull from SES Sending Statistics / SNS notifications
      Rails.logger.info("[SuppressionSync] SES sync pending for #{tenant.name}")
    else
      Rails.logger.debug("[SuppressionSync] No sync strategy for #{pc.provider}")
    end
  end
end
