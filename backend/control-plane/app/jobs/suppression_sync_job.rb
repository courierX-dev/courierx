# frozen_string_literal: true

# SuppressionSyncJob
#
# Pulls bounces, unsubscribes, and complaints from SendGrid and Mailgun BYOK
# connections and upserts them into the tenant's suppressions table.
# SES suppression is handled separately via SNS webhook (see provider_webhooks/ses_controller.rb).
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
      sync_sendgrid(tenant, pc)
    when "mailgun"
      sync_mailgun(tenant, pc)
    when "aws_ses"
      Rails.logger.debug("[SuppressionSync] SES suppression handled via SNS webhook for #{tenant.name}")
    else
      Rails.logger.debug("[SuppressionSync] No sync strategy for #{pc.provider}")
    end
  rescue StandardError => e
    Rails.logger.error("[SuppressionSync] #{pc.provider} sync failed for #{tenant.name}: #{e.message}")
    Sentry.capture_exception(e) if defined?(Sentry)
  end

  # ── SendGrid ──────────────────────────────────────────────────────────────

  def sync_sendgrid(tenant, pc)
    api_key = pc.api_key
    return unless api_key.present?

    upsert_suppressions(tenant, fetch_sendgrid_bounces(api_key),      "hard_bounce")
    upsert_suppressions(tenant, fetch_sendgrid_unsubscribes(api_key), "unsubscribe")
    upsert_suppressions(tenant, fetch_sendgrid_spam_reports(api_key), "complaint")

    Rails.logger.info("[SuppressionSync] SendGrid sync complete for #{tenant.name}")
  end

  def fetch_sendgrid_bounces(api_key)
    sendgrid_paginate("https://api.sendgrid.com/v3/suppression/bounces", api_key) do |item|
      item["email"]
    end
  end

  def fetch_sendgrid_unsubscribes(api_key)
    sendgrid_paginate("https://api.sendgrid.com/v3/suppression/unsubscribes", api_key) do |item|
      item["email"]
    end
  end

  def fetch_sendgrid_spam_reports(api_key)
    sendgrid_paginate("https://api.sendgrid.com/v3/suppression/spam_reports", api_key) do |item|
      item["email"]
    end
  end

  def sendgrid_paginate(base_url, api_key, page_size: 500, &extractor)
    emails  = []
    offset  = 0

    loop do
      uri  = URI("#{base_url}?limit=#{page_size}&offset=#{offset}")
      resp = sendgrid_get(uri, api_key)
      break unless resp.is_a?(Net::HTTPSuccess)

      items = JSON.parse(resp.body)
      break if items.empty?

      emails.concat(items.filter_map(&extractor))
      break if items.size < page_size

      offset += page_size
    end

    emails
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout => e
    Rails.logger.warn("[SuppressionSync] SendGrid pagination error: #{e.message}")
    []
  end

  def sendgrid_get(uri, api_key)
    http             = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl     = true
    http.read_timeout = 30
    req              = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{api_key}"
    req["Accept"]        = "application/json"
    http.request(req)
  end

  # ── Mailgun ───────────────────────────────────────────────────────────────

  def sync_mailgun(tenant, pc)
    api_key = pc.api_key
    domain  = pc.smtp_host  # smtp_host stores the Mailgun sending domain
    region  = pc.region.presence || "us"
    return unless api_key.present? && domain.present?

    base = region == "eu" ? "https://api.eu.mailgun.net/v3" : "https://api.mailgun.net/v3"

    upsert_suppressions(tenant, fetch_mailgun_list("#{base}/#{domain}/bounces",     api_key), "hard_bounce")
    upsert_suppressions(tenant, fetch_mailgun_list("#{base}/#{domain}/unsubscribes", api_key), "unsubscribe")
    upsert_suppressions(tenant, fetch_mailgun_list("#{base}/#{domain}/complaints",   api_key), "complaint")

    Rails.logger.info("[SuppressionSync] Mailgun sync complete for #{tenant.name}")
  end

  def fetch_mailgun_list(base_url, api_key, page_size: 1000)
    emails  = []
    url     = "#{base_url}?limit=#{page_size}"

    loop do
      uri  = URI(url)
      resp = mailgun_get(uri, api_key)
      break unless resp.is_a?(Net::HTTPSuccess)

      data  = JSON.parse(resp.body)
      items = data["items"] || []
      break if items.empty?

      emails.concat(items.filter_map { |i| i["address"] })

      # Mailgun returns a paging token in data["paging"]["next"] when more pages exist
      next_page = data.dig("paging", "next")
      break if next_page.blank? || items.size < page_size

      url = next_page
    end

    emails
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout => e
    Rails.logger.warn("[SuppressionSync] Mailgun pagination error: #{e.message}")
    []
  end

  def mailgun_get(uri, api_key)
    http              = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl      = true
    http.read_timeout = 30
    req               = Net::HTTP::Get.new(uri)
    req.basic_auth("api", api_key)
    req["Accept"] = "application/json"
    http.request(req)
  end

  # ── Shared ────────────────────────────────────────────────────────────────

  def upsert_suppressions(tenant, emails, reason)
    return if emails.empty?

    now    = Time.current
    emails.uniq.each do |email|
      normalized = email.downcase.strip
      next if normalized.blank?

      Suppression.find_or_create_by(tenant: tenant, email: normalized) do |s|
        s.reason = reason
      end
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[SuppressionSync] Failed to upsert #{normalized}: #{e.message}")
    end

    Rails.logger.debug("[SuppressionSync] Upserted #{emails.size} #{reason} suppressions for #{tenant.name}")
  end
end
