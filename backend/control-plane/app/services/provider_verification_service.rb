# frozen_string_literal: true

# ProviderVerificationService
#
# Calls the Go Core Engine's POST /internal/verify-provider endpoint to check
# whether provider credentials are valid. Credentials are decrypted server-side
# and sent over the internal network — never exposed to the frontend.
#
# Usage:
#   result = ProviderVerificationService.call(connection)
#   result[:verified] # => true/false
#   result[:error]    # => error string on failure
#
class ProviderVerificationService
  PROVIDER_CONFIG_MAP = {
    "sendgrid" => ->(c) { { apiKey: c.api_key } },
    "mailgun"  => ->(c) { { apiKey: c.api_key, domain: c.smtp_host, region: c.region || "us" } },
    "aws_ses"  => ->(c) { { accessKeyId: c.api_key, secretAccessKey: c.secret, region: c.region || "us-east-1" } },
    "resend"   => ->(c) { { apiKey: c.api_key } },
    "postmark" => ->(c) { { serverToken: c.api_key } },
    "smtp"     => ->(c) { { host: c.smtp_host, port: c.smtp_port || 587, user: c.api_key, pass: c.secret } },
  }.freeze

  # Map Rails provider names to Go provider type strings
  GO_PROVIDER_TYPE = {
    "sendgrid" => "sendgrid",
    "mailgun"  => "mailgun",
    "aws_ses"  => "ses",
    "resend"   => "resend",
    "postmark" => "postmark",
    "smtp"     => "smtp",
  }.freeze

  def self.call(connection)
    new(connection).call
  end

  def initialize(connection)
    @connection = connection
  end

  def call
    config_builder = PROVIDER_CONFIG_MAP[@connection.provider]
    return { verified: false, error: "Unknown provider: #{@connection.provider}" } unless config_builder

    go_type = GO_PROVIDER_TYPE[@connection.provider]
    config  = config_builder.call(@connection)

    response = post_to_go(go_type, config)

    if response[:verified]
      @connection.update_columns(status: "active", last_health_check_at: Time.current, consecutive_failures: 0)
    else
      @connection.update_columns(status: "inactive")
    end

    response
  rescue Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNREFUSED => e
    { verified: false, error: "Could not reach verification service: #{e.message}" }
  rescue StandardError => e
    { verified: false, error: "Verification failed: #{e.message}" }
  end

  private

  def post_to_go(provider, config)
    uri = URI.join(go_core_url, "/internal/verify-provider")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 5
    http.read_timeout = 20

    request = Net::HTTP::Post.new(uri.path, {
      "Content-Type"      => "application/json",
      "X-Internal-Secret" => go_core_secret,
    })
    request.body = { provider: provider, config: config }.to_json

    response = http.request(request)
    JSON.parse(response.body, symbolize_names: true)
  end

  def go_core_url
    ENV.fetch("GO_CORE_URL", "http://localhost:8080")
  end

  def go_core_secret
    ENV.fetch("GO_CORE_SECRET", "")
  end
end
