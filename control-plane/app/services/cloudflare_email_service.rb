# frozen_string_literal: true

# CloudflareEmailService
#
# Manages Cloudflare Email Routing for inbound email processing.
# Creates catch-all rules and destination addresses.
#
# This is a stub — expand when inbound email parsing is needed.
#
# Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_ACCOUNT_ID
#
class CloudflareEmailService
  BASE_URL = "https://api.cloudflare.com/client/v4"

  class << self
    def configured?
      ENV["CLOUDFLARE_API_TOKEN"].present? &&
        ENV["CLOUDFLARE_ZONE_ID"].present? &&
        ENV["CLOUDFLARE_ACCOUNT_ID"].present?
    end

    # Creates a catch-all rule that forwards all inbound email to a webhook
    def create_catch_all_rule(destination_email)
      return unless configured?

      payload = {
        actions: [{ type: "forward", value: [ destination_email ] }],
        enabled: true,
        matchers: [{ field: "to", type: "all" }],
        name: "CourierX catch-all inbound"
      }

      response = client.post("#{zone_url}/email/routing/rules") do |req|
        req.body = payload.to_json
      end

      body = JSON.parse(response.body)
      if body["success"]
        Rails.logger.info("[CloudflareEmail] Catch-all rule created → #{destination_email}")
        body["result"]
      else
        Rails.logger.error("[CloudflareEmail] Rule creation failed: #{body['errors']}")
        nil
      end
    end

    # Creates a verified destination address for email forwarding
    def create_destination_address(email)
      return unless configured?

      response = client.post("#{account_url}/email/routing/addresses") do |req|
        req.body = { email: email }.to_json
      end

      body = JSON.parse(response.body)
      if body["success"]
        Rails.logger.info("[CloudflareEmail] Destination address created: #{email}")
        body["result"]
      else
        Rails.logger.error("[CloudflareEmail] Address creation failed: #{body['errors']}")
        nil
      end
    end

    # Lists existing routing rules
    def list_rules
      return [] unless configured?

      response = client.get("#{zone_url}/email/routing/rules")
      body = JSON.parse(response.body)
      body["success"] ? body["result"] : []
    end

    # Enables email routing for the zone
    def enable_routing
      return unless configured?

      response = client.post("#{zone_url}/email/routing/enable")
      body = JSON.parse(response.body)
      Rails.logger.info("[CloudflareEmail] Routing enabled: #{body['success']}")
      body["success"]
    end

    private

    def zone_url
      "#{BASE_URL}/zones/#{ENV['CLOUDFLARE_ZONE_ID']}"
    end

    def account_url
      "#{BASE_URL}/accounts/#{ENV['CLOUDFLARE_ACCOUNT_ID']}"
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
