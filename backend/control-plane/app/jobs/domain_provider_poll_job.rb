# frozen_string_literal: true

# DomainProviderPollJob
#
# Polls each pending DomainProviderVerification row, calling the provider's
# verify endpoint to see if DNS has propagated and the provider has confirmed
# DKIM/SPF. On success, flips the DPV to "verified". Also rolls up to the
# parent Domain — once any DPV verifies, the domain is considered verified
# (a tenant can send through at least one provider).
#
# Schedule: self-reenqueues every 15 minutes while any DPV is still pending
# and less than 72 hours old. No sidekiq-cron gem required.
#
class DomainProviderPollJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 2

  POLL_INTERVAL   = 15.minutes
  POLL_MAX_AGE    = 72.hours
  TERMINAL_STATES = %w[verified failed].freeze

  def perform(domain_id)
    domain = Domain.find_by(id: domain_id)
    return unless domain

    pending = domain.domain_provider_verifications.where.not(status: TERMINAL_STATES)
    return if pending.empty?

    pending.each { |dpv| check(dpv, domain) }

    roll_up_domain_status(domain)

    # Reenqueue if any DPV is still pending and within the poll window
    still_pending = domain.domain_provider_verifications
                          .where.not(status: TERMINAL_STATES)
                          .where("created_at > ?", POLL_MAX_AGE.ago)
    self.class.perform_in(POLL_INTERVAL, domain.id) if still_pending.exists?
  end

  private

  def check(dpv, domain)
    connection = domain.tenant.provider_connections.find_by(provider: dpv.provider, status: "active")
    unless connection
      dpv.update!(status: "failed", error: "No active provider connection", last_checked_at: Time.current)
      return
    end

    adapter = adapter_for(dpv.provider)
    result  = adapter.verify(domain, connection, external_id: dpv.external_domain_id)

    if result[:verified]
      dpv.update!(status: "verified", verified_at: Time.current, last_checked_at: Time.current, error: nil)
    elsif dpv.created_at < POLL_MAX_AGE.ago
      dpv.update!(status: "failed", error: result[:error] || "Verification window exceeded", last_checked_at: Time.current)
    else
      dpv.update!(last_checked_at: Time.current, error: result[:error])
    end
  rescue StandardError => e
    dpv.update!(last_checked_at: Time.current, error: e.message)
    Sentry.capture_exception(e) if defined?(Sentry)
  end

  def roll_up_domain_status(domain)
    any_verified = domain.domain_provider_verifications.where(status: "verified").exists?
    if any_verified && domain.status != "verified"
      domain.update!(status: "verified", verified_at: Time.current)
    end
  end

  def adapter_for(provider)
    case provider
    when "sendgrid" then DomainAdapters::Sendgrid.new
    when "resend"   then DomainAdapters::Resend.new
    when "mailgun"  then DomainAdapters::Mailgun.new
    when "aws_ses"  then DomainAdapters::Ses.new
    when "postmark" then DomainAdapters::Postmark.new
    else                 DomainAdapters::NullAdapter.new
    end
  end
end
