# frozen_string_literal: true

# CloudEventJob
#
# Delivers an OutboxEvent with destination="cloud" to the cloud service's
# /internal/events endpoint. Same durability semantics as OutboxProcessorJob:
# atomic status transition, max_attempts bounded, Sidekiq retry on failure.
#
# In OSS mode (COURIERX_EDITION != "cloud" AND CLOUD_SERVICE_URL unset) the
# job no-ops and marks the event processed — self-hosters never emit or need
# to deliver these events.
class CloudEventJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 5

  def perform(outbox_event_id)
    return unless CloudClient.enabled?

    updated = OutboxEvent.where(id: outbox_event_id, status: "pending", destination: "cloud")
                         .update_all(status: "processing",
                                     attempt_count: Arel.sql("attempt_count + 1"))

    if updated.zero?
      # Either the row isn't committed yet (enqueued from inside a transaction)
      # or it's already processed. Check: if the row exists and is already
      # processed/dead, we're done. Otherwise raise so Sidekiq retries.
      event = OutboxEvent.find_by(id: outbox_event_id)
      return if event && %w[processed dead].include?(event.status)
      raise "OutboxEvent #{outbox_event_id} not ready (transaction not committed?)"
    end

    event = OutboxEvent.find(outbox_event_id)
    CloudClient.publish_event!(event_type: event.event_type, payload: event.payload)
    event.complete!
  rescue CloudClient::Error => e
    event&.fail!(e.message)
    raise
  rescue => e
    event&.fail!(e.message)
    raise
  end
end
