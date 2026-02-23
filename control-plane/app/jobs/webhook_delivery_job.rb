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

  def perform(webhook_endpoint_id, event_payload)
    endpoint = WebhookEndpoint.find(webhook_endpoint_id)
    return unless endpoint.is_active?

    payload_json = event_payload.to_json
    timestamp    = Time.current.to_i
    signature    = compute_signature(endpoint.secret, timestamp, payload_json)

    delivery = endpoint.webhook_deliveries.create!(
      event_type:     event_payload["event"],
      payload:        event_payload,
      response_code:  nil,
      response_body:  nil,
      success:        false,
      attempt_number: (endpoint.webhook_deliveries.where(event_type: event_payload["event"]).count + 1)
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
      response_code: response.status,
      response_body: response.body&.truncate(2000),
      success:       response.success?
    )

    unless response.success?
      raise "Webhook delivery failed: #{response.status}"
    end
  rescue Faraday::Error => e
    delivery&.update!(
      response_body: e.message.truncate(2000),
      success:       false,
      next_retry_at: delivery&.next_retry_time
    )
    raise # Let Sidekiq retry
  end

  private

  def compute_signature(secret, timestamp, body)
    payload = "#{timestamp}.#{body}"
    OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
  end
end
