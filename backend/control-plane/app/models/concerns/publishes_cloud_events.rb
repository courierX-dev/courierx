# frozen_string_literal: true

# PublishesCloudEvents
#
# Include in an ActiveRecord model to get #publish_cloud_event(event_type, payload)
# which enqueues an OutboxEvent(destination: "cloud") in the current transaction
# and schedules CloudEventJob to deliver it.
#
# The outbox write happens inside the same transaction as the domain change,
# so we never publish phantom events for rolled-back writes. Sidekiq enqueue
# happens via after_commit so the worker doesn't pick up the row before the
# transaction is visible.
module PublishesCloudEvents
  extend ActiveSupport::Concern

  def publish_cloud_event(event_type, payload = {})
    return unless CloudClient.enabled?

    event = OutboxEvent.create!(
      destination: "cloud",
      event_type:  event_type,
      status:      "pending",
      payload:     payload,
      max_attempts: 10
    )
    # If we're inside a transaction, the row isn't visible yet. Sidekiq's retry
    # heals the race: CloudEventJob's opening update_all returns 0, job returns
    # early, Sidekiq re-enqueues on the next tick.
    CloudEventJob.perform_async(event.id)
  rescue => e
    Rails.logger.error "[PublishesCloudEvents] failed to enqueue #{event_type}: #{e.class}: #{e.message}"
  end
end
