# frozen_string_literal: true

# OutboxProcessorJob
#
# Picks up a pending OutboxEvent and POSTs the email payload to the Go
# send engine at GO_ENGINE_URL/v1/send. On success marks the outbox as
# processed; on failure uses exponential backoff for retries.
#
class OutboxProcessorJob
  include Sidekiq::Job

  sidekiq_options queue: :critical, retry: 5

  GO_ENGINE_URL = ENV.fetch("GO_CORE_URL", "http://localhost:8080")
  GO_SHARED_SECRET = ENV.fetch("GO_CORE_SECRET", "dev-secret")

  def perform(outbox_event_id)
    event = OutboxEvent.find(outbox_event_id)
    return if event.status == "processed"

    event.process!

    email = Email.find(event.payload["email_id"])
    tenant = Tenant.find(event.payload["tenant_id"])

    # Build payload for Go engine
    payload = {
      email_id:   email.id,
      tenant_id:  tenant.id,
      from_email: email.from_email,
      from_name:  email.from_name,
      to_email:   email.to_email,
      to_name:    email.to_name,
      reply_to:   email.reply_to,
      subject:    email.subject,
      html_body:  email.html_body,
      text_body:  email.text_body,
      tags:       email.tags,
      metadata:   email.metadata
    }

    # POST to Go engine
    response = Faraday.post("#{GO_ENGINE_URL}/v1/send") do |req|
      req.headers["Content-Type"] = "application/json"
      req.headers["X-Shared-Secret"] = GO_SHARED_SECRET
      req.body = payload.to_json
    end

    if response.success?
      body = JSON.parse(response.body)
      email.mark_sent!(
        provider_message_id: body["provider_message_id"],
        provider_connection: ProviderConnection.find_by(id: body["provider_connection_id"])
      )
      event.complete!
    else
      email.mark_failed!(error: "Go engine returned #{response.status}: #{response.body}")
      event.fail!("Go engine returned #{response.status}")
    end
  rescue Faraday::Error => e
    event.fail!(e.message)
    email&.mark_failed!(error: e.message)
  end
end
