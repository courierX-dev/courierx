# frozen_string_literal: true

module DomainAdapters
  # Resend domain registration & verification.
  # API: https://resend.com/docs/api-reference/domains
  class Resend < Base
    BASE_URL = "https://api.resend.com"

    def register(domain, connection)
      res = http_post(
        "#{BASE_URL}/domains",
        headers: { "Authorization" => "Bearer #{connection.api_key}" },
        body:    { name: domain.domain, region: "us-east-1" }
      )

      return { success: false, error: res[:body]["message"] || "HTTP #{res[:status]}" } unless res[:status] == 200 || res[:status] == 201

      records = (res[:body]["records"] || []).map do |r|
        { type: r["type"], name: r["name"], value: r["value"], ttl: r["ttl"] || 3600 }
      end

      { success: true, external_domain_id: res[:body]["id"], records: records }
    end

    def verify(_domain, connection, external_id:)
      res = http_get(
        "#{BASE_URL}/domains/#{external_id}",
        headers: { "Authorization" => "Bearer #{connection.api_key}" }
      )
      return { verified: false, error: "HTTP #{res[:status]}" } unless res[:status] == 200

      { verified: res[:body]["status"] == "verified" }
    end
  end
end
