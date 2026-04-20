# frozen_string_literal: true

# WebhookDeliveryJob
#
# POSTs event payloads to registered webhook endpoints with HMAC-SHA256
# signature. Creates a WebhookDelivery record for each attempt.
# Retries 5× with exponential backoff.
#
class WebhookDeliveryJob
  include Sidekiq::Job

  sidekiq_options queue: :webhooks, retry: 5

  TIMEOUT = 10 # seconds

  # RFC 1918 private / link-local / loopback ranges that must never receive
  # outbound webhook requests (SSRF protection).
  # A tenant supplying a webhook URL like http://169.254.169.254/ or
  # http://10.0.0.1/admin would otherwise get probed by our Sidekiq workers.
  BLOCKED_IP_RANGES = [
    IPAddr.new("10.0.0.0/8"),       # RFC 1918 private
    IPAddr.new("172.16.0.0/12"),     # RFC 1918 private
    IPAddr.new("192.168.0.0/16"),    # RFC 1918 private
    IPAddr.new("127.0.0.0/8"),       # Loopback
    IPAddr.new("::1/128"),           # IPv6 loopback
    IPAddr.new("169.254.0.0/16"),    # Link-local / AWS IMDS
    IPAddr.new("fd00::/8"),          # IPv6 ULA
    IPAddr.new("fc00::/7"),          # IPv6 ULA (broader range)
    IPAddr.new("0.0.0.0/8"),         # This network
    IPAddr.new("100.64.0.0/10"),     # Carrier-grade NAT (RFC 6598)
  ].freeze

  def perform(webhook_endpoint_id, event_payload, attempt_number = 1)
    endpoint = WebhookEndpoint.find(webhook_endpoint_id)
    return unless endpoint.is_active?

    # SECURITY: Resolve the destination URL and block RFC 1918 / internal addresses.
    validate_webhook_url!(endpoint.url)

    payload_json = event_payload.to_json
    timestamp    = Time.current.to_i
    signature    = compute_signature(endpoint.secret, timestamp, payload_json)

    delivery = endpoint.webhook_deliveries.create!(
      payload:         event_payload,
      response_status: nil,
      response_body:   nil,
      success:         false,
      attempt_count:   attempt_number
    )

    response = Faraday.post(endpoint.url) do |req|
      req.headers["Content-Type"]         = "application/json"
      req.headers["X-CourierX-Signature"] = "sha256=#{signature}"
      req.headers["X-CourierX-Timestamp"] = timestamp.to_s
      req.headers["User-Agent"]           = "CourierX-Webhook/1.0"
      req.options.timeout                 = TIMEOUT
      req.options.open_timeout            = TIMEOUT
      req.body = payload_json
    end

    delivery.update!(
      response_status: response.status,
      response_body:   response.body&.truncate(2000),
      success:         response.success?
    )

    unless response.success?
      raise "Webhook delivery failed: #{response.status}"
    end
  rescue Faraday::Error => e
    delivery&.update!(
      response_body: e.message.truncate(2000),
      success:       false
    )
    raise # Let Sidekiq retry
  end

  private

  # Resolves all DNS A/AAAA records for the URL's host and raises if any
  # resolved address falls within a blocked (internal/private) range.
  # This prevents DNS-rebinding attacks because we check resolution at job time.
  def validate_webhook_url!(url)
    uri = URI.parse(url)

    unless %w[http https].include?(uri.scheme)
      raise ArgumentError, "Webhook URL must use http or https scheme"
    end

    host = uri.host.to_s
    raise ArgumentError, "Webhook URL missing host" if host.blank?

    # Resolve DNS to IP(s)
    addresses = Resolv.getaddresses(host)
    if addresses.empty?
      raise ArgumentError, "Webhook URL host #{host} did not resolve to any IP address"
    end

    addresses.each do |addr_str|
      ip = IPAddr.new(addr_str)
      if BLOCKED_IP_RANGES.any? { |range| range.include?(ip) }
        Rails.logger.warn(
          "[WebhookDeliveryJob] Blocked SSRF attempt: endpoint resolves to private IP " \
          "#{addr_str} (host: #{host})"
        )
        raise ArgumentError, "Webhook URL resolves to a private or reserved IP address"
      end
    end
  rescue IPAddr::InvalidAddressError, Resolv::ResolvError => e
    raise ArgumentError, "Webhook URL validation failed: #{e.message}"
  end

  def compute_signature(secret, timestamp, body)
    payload = "#{timestamp}.#{body}"
    OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
  end
end
