# frozen_string_literal: true

# CloudflareDnsService
#
# Manages DNS records for tenant domains via the Cloudflare API v4.
# Requires CLOUDFLARE_API_TOKEN (scoped: Zone.DNS.Edit) and CLOUDFLARE_ZONE_ID.
#
# Usage:
#   CloudflareDnsService.create_verification_record(domain)
#   CloudflareDnsService.create_spf_record(domain)
#   CloudflareDnsService.create_dkim_record(domain)
#   CloudflareDnsService.delete_records(domain)
#
class CloudflareDnsService
  BASE_URL = "https://api.cloudflare.com/client/v4"

  class << self
    def configured?
      ENV["CLOUDFLARE_API_TOKEN"].present? && ENV["CLOUDFLARE_ZONE_ID"].present?
    end

    # Creates the TXT verification record for domain ownership
    def create_verification_record(domain)
      return unless configured?

      create_dns_record(
        type:    "TXT",
        name:    domain.domain,
        content: domain.verification_token,
        comment: "CourierX domain verification"
      )
    end

    # Creates the SPF TXT record
    def create_spf_record(domain)
      return unless configured?

      create_dns_record(
        type:    "TXT",
        name:    domain.domain,
        content: "v=spf1 include:spf.courierx.dev ~all",
        comment: "CourierX SPF record"
      )
    end

    # Creates the DKIM TXT record
    def create_dkim_record(domain)
      return unless configured?
      return unless domain.dkim_selector.present?

      create_dns_record(
        type:    "TXT",
        name:    "#{domain.dkim_selector}._domainkey.#{domain.domain}",
        content: domain.dkim_public_key,
        comment: "CourierX DKIM record"
      )
    end

    # Creates a DMARC policy record
    def create_dmarc_record(domain, policy: "none")
      return unless configured?

      create_dns_record(
        type:    "TXT",
        name:    "_dmarc.#{domain.domain}",
        content: "v=DMARC1; p=#{policy}; rua=mailto:dmarc@#{domain.domain}",
        comment: "CourierX DMARC record"
      )
    end

    # Deletes all CourierX-managed DNS records for a domain
    def delete_records(domain)
      return unless configured?

      records = list_dns_records(domain.domain)
      records.each do |record|
        next unless record["comment"]&.start_with?("CourierX")
        delete_dns_record(record["id"])
      end
    end

    # Lists existing DNS records for the domain
    def list_dns_records(domain_name)
      response = client.get("#{zone_url}/dns_records", { name: domain_name, type: "TXT" })
      body = JSON.parse(response.body)

      if body["success"]
        body["result"] || []
      else
        Rails.logger.error("[Cloudflare] List failed: #{body['errors']}")
        []
      end
    end

    # Verifies a domain by checking if the TXT record exists in Cloudflare
    def verify_domain(domain)
      records = list_dns_records(domain.domain)
      records.any? { |r| r["content"]&.include?(domain.verification_token) }
    end

    private

    def create_dns_record(type:, name:, content:, comment: nil)
      payload = { type: type, name: name, content: content, ttl: 300, comment: comment }.compact

      response = client.post("#{zone_url}/dns_records") do |req|
        req.headers["Content-Type"] = "application/json"
        req.body = payload.to_json
      end

      body = JSON.parse(response.body)

      if body["success"]
        Rails.logger.info("[Cloudflare] Created #{type} record: #{name}")
        body["result"]
      else
        error = body["errors"]&.first
        # 81057 = record already exists — not an error
        if error && error["code"] == 81057
          Rails.logger.info("[Cloudflare] Record already exists: #{name}")
        else
          Rails.logger.error("[Cloudflare] Create failed: #{body['errors']}")
        end
        nil
      end
    end

    def delete_dns_record(record_id)
      response = client.delete("#{zone_url}/dns_records/#{record_id}")
      body = JSON.parse(response.body)

      unless body["success"]
        Rails.logger.error("[Cloudflare] Delete failed for #{record_id}: #{body['errors']}")
      end
    end

    def zone_url
      "#{BASE_URL}/zones/#{ENV['CLOUDFLARE_ZONE_ID']}"
    end

    def client
      @client ||= Faraday.new do |f|
        f.headers["Authorization"] = "Bearer #{ENV['CLOUDFLARE_API_TOKEN']}"
        f.headers["Content-Type"]  = "application/json"
        f.options.timeout          = 10
        f.adapter Faraday.default_adapter
      end
    end
  end
end
