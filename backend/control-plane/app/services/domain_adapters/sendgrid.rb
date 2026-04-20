# frozen_string_literal: true

module DomainAdapters
  # SendGrid domain authentication.
  # API: https://docs.sendgrid.com/api-reference/domain-authentication
  class Sendgrid < Base
    BASE_URL = "https://api.sendgrid.com/v3"

    def register(domain, connection)
      res = http_post(
        "#{BASE_URL}/whitelabel/domains",
        headers: { "Authorization" => "Bearer #{connection.api_key}" },
        body:    { domain: domain.domain, automatic_security: true }
      )

      return { success: false, error: res[:body]["errors"]&.first&.dig("message") || "HTTP #{res[:status]}" } unless res[:status] == 201

      dns = res[:body]["dns"] || {}
      records = dns.values.map do |r|
        {
          type:  r["type"].to_s.upcase,
          name:  r["host"],
          value: r["data"],
          ttl:   3600
        }
      end

      { success: true, external_domain_id: res[:body]["id"].to_s, records: records }
    end

    def verify(_domain, connection, external_id:)
      res = http_post(
        "#{BASE_URL}/whitelabel/domains/#{external_id}/validate",
        headers: { "Authorization" => "Bearer #{connection.api_key}" },
        body:    {}
      )
      return { verified: false, error: "HTTP #{res[:status]}" } unless res[:status] == 200

      { verified: res[:body]["valid"] == true }
    end
  end
end
