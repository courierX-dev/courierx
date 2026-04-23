# frozen_string_literal: true

# DomainVerificationJob
#
# Performs DNS TXT record lookup to verify domain ownership.
# Uses Cloudflare API if configured, falls back to Ruby Resolv pointed at
# public resolvers (1.1.1.1, 8.8.8.8) to avoid the system resolver's stale
# cache slowing first-time verification.
#
# Self-reschedules with exponential backoff while the domain is younger than
# 48 hours so the user does not have to keep clicking "Verify".

class DomainVerificationJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  PUBLIC_RESOLVERS = ["1.1.1.1", "1.0.0.1", "8.8.8.8"].freeze
  BACKOFF_SCHEDULE = [15, 30, 60, 120, 300, 600, 1800].freeze

  def perform(domain_id, attempt = 0)
    domain = Domain.find(domain_id)
    return if domain.status == "verified"

    resolver = Resolv::DNS.new(nameserver: PUBLIC_RESOLVERS)
    resolver.timeouts = [3, 5]

    if CloudflareDnsService.configured? && domain.created_at > 5.minutes.ago
      push_cloudflare_records(domain)
    end

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
      Sentry.capture_message("Domain verified: #{domain.domain}", level: :info) if defined?(Sentry)
      return
    end

    if domain.created_at < 48.hours.ago
      domain.update!(status: "failed")
      Sentry.capture_message("Domain verification failed: #{domain.domain}", level: :warning) if defined?(Sentry)
      return
    end

    delay = BACKOFF_SCHEDULE[attempt] || BACKOFF_SCHEDULE.last
    self.class.perform_in(delay.seconds, domain_id, attempt + 1)
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
