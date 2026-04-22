# frozen_string_literal: true

# DomainVerificationJob
#
# Performs DNS TXT record lookup to verify domain ownership.
# Uses Cloudflare API if configured, falls back to Ruby Resolv.
#
class DomainVerificationJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(domain_id)
    domain = Domain.find(domain_id)
    return if domain.status == "verified"

    # Share a single resolver across all DNS checks to avoid opening three
    # separate UDP socket pools for one job run.
    resolver = Resolv::DNS.new

    # 1. If Cloudflare is configured, push DNS records first
    if CloudflareDnsService.configured? && domain.created_at > 5.minutes.ago
      push_cloudflare_records(domain)
    end

    # 2. Check if verification token is resolvable
    verification_host = "_courierx-verification.#{domain.domain}"
    token_found = if CloudflareDnsService.configured?
                    CloudflareDnsService.verify_domain(domain)
                  else
                    check_txt_via_resolv(verification_host, domain.verification_token, resolver)
                  end

    if token_found
      domain.update!(status: "verified", verified_at: Time.current)
      check_spf(domain, resolver)
      check_dkim(domain, resolver)

      Sentry.capture_message("Domain verified: #{domain.domain}",
                             level: :info) if defined?(Sentry)
    else
      if domain.created_at < 48.hours.ago
        domain.update!(status: "failed")
        Sentry.capture_message("Domain verification failed: #{domain.domain}",
                               level: :warning) if defined?(Sentry)
      end
      # If younger than 48h, leave as pending — DNS propagation
    end
  ensure
    resolver&.close
  end

  private

  def push_cloudflare_records(domain)
    CloudflareDnsService.create_verification_record(domain)
    CloudflareDnsService.create_spf_record(domain)
    CloudflareDnsService.create_dmarc_record(domain)
  rescue StandardError => e
    Rails.logger.warn("[DomainVerification] Cloudflare push failed: #{e.message}")
    Sentry.capture_exception(e) if defined?(Sentry)
  end

  def check_txt_via_resolv(domain_name, token, resolver)
    records = resolver.getresources(domain_name, Resolv::DNS::Resource::IN::TXT)
    records.any? { |r| r.strings.any? { |s| s.include?(token) } }
  rescue Resolv::ResolvError, Resolv::ResolvTimeout => e
    Rails.logger.warn("[DomainVerification] DNS lookup failed: #{e.message}")
    false
  end

  def check_spf(domain, resolver)
    records = resolver.getresources(domain.domain, Resolv::DNS::Resource::IN::TXT)
    spf = records.flat_map(&:strings).find { |s| s.start_with?("v=spf1") }
    domain.update!(spf_record: spf) if spf
  rescue StandardError => e
    Rails.logger.warn("[DomainVerification] SPF check failed: #{e.message}")
  end

  def check_dkim(domain, resolver)
    return unless domain.dkim_selector.present?

    dkim_domain = "#{domain.dkim_selector}._domainkey.#{domain.domain}"
    records = resolver.getresources(dkim_domain, Resolv::DNS::Resource::IN::TXT)
    dkim = records.flat_map(&:strings).find { |s| s.include?("v=DKIM1") }
    domain.update!(dkim_public_key: dkim) if dkim
  rescue StandardError => e
    Rails.logger.warn("[DomainVerification] DKIM check failed: #{e.message}")
  end
end
