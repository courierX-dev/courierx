# frozen_string_literal: true

# DomainAdapters — per-provider adapters for domain registration & verification.
#
# Each adapter implements:
#   #register(domain, connection) → { success:, records: [...], external_domain_id:, error: }
#   #verify(domain, connection)   → { verified:, error: }
#
# Record format: each entry is a hash the frontend can render directly:
#   { type: "TXT" | "CNAME" | "MX", name: "...", value: "...", ttl: 3600 }
#
module DomainAdapters
  class Base
    def register(_domain, _connection)
      raise NotImplementedError
    end

    def verify(_domain, _connection)
      raise NotImplementedError
    end

    protected

    def http_post(url, headers:, body:)
      uri = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 10
      http.read_timeout = 20

      req = Net::HTTP::Post.new(uri.request_uri, default_headers.merge(headers))
      req.body = body.to_json
      parse(http.request(req))
    end

    def http_get(url, headers:)
      uri = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 10
      http.read_timeout = 20

      req = Net::HTTP::Get.new(uri.request_uri, default_headers.merge(headers))
      parse(http.request(req))
    end

    def default_headers
      { "Content-Type" => "application/json", "Accept" => "application/json" }
    end

    def parse(response)
      body = response.body.to_s.empty? ? {} : (JSON.parse(response.body) rescue {})
      { status: response.code.to_i, body: body }
    end
  end

  class NullAdapter < Base
    def register(_domain, _connection)
      { success: false, error: "Propagation adapter not implemented for this provider" }
    end

    def verify(_domain, _connection)
      { verified: false, error: "Verification adapter not implemented for this provider" }
    end
  end
end
