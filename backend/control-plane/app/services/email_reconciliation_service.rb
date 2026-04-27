# frozen_string_literal: true

# EmailReconciliationService
#
# Resolves emails that are stuck in non-terminal states. Two failure modes
# this is designed to repair:
#
#   1. Email in `queued` — the OutboxEvent never reached the Go engine
#      (Sidekiq down at dispatch time, retries exhausted with the engine
#      unreachable, outbox row missing, etc.). The reconciler resets the
#      outbox to pending and re-enqueues OutboxProcessorJob. The job's own
#      atomic guard makes this safe to call repeatedly.
#
#   2. Email in `sent` — Go accepted the message and got a provider
#      message id, but no inbound webhook ever updated it to delivered/
#      bounced. Common causes: webhook URL not registered with the
#      provider, signing key mismatch, provider→us transport blip. The
#      reconciler polls the provider's status API directly via
#      ProviderStatusPoller. If a terminal event is found, it's applied
#      via ProviderEventProcessor (same code path as the webhook). If no
#      event is found and the email is older than ExpiredSentThreshold,
#      it's marked failed so it stops being a phantom "Sending".
#
# Terminal statuses (delivered/bounced/complained/failed/suppressed) are
# left alone.
class EmailReconciliationService
  TERMINAL_STATUSES        = %w[delivered bounced complained failed suppressed].freeze
  STALE_QUEUED_THRESHOLD   = 5.minutes
  STALE_SENT_THRESHOLD     = 1.hour
  EXPIRED_SENT_THRESHOLD   = 72.hours

  Result = Struct.new(:action, :email, :detail, keyword_init: true) do
    def to_h
      {
        action:    action,
        email_id:  email&.id,
        status:    email&.status,
        detail:    detail
      }
    end
  end

  def self.call(email:)
    new(email).call
  end

  def initialize(email)
    @email = email
  end

  def call
    return result(:terminal, "status=#{@email.status}") if TERMINAL_STATUSES.include?(@email.status)

    case @email.status
    when "queued"
      reconcile_queued
    when "sent"
      reconcile_sent
    else
      result(:noop, "unhandled status=#{@email.status}")
    end
  end

  private

  def reconcile_queued
    age = Time.current - @email.created_at
    return result(:too_recent, "queued for #{age.to_i}s, threshold=#{STALE_QUEUED_THRESHOLD.to_i}s") if age < STALE_QUEUED_THRESHOLD

    outbox = @email.outbox_event

    if outbox.nil?
      outbox = OutboxEvent.create!(
        event_type: "send_email",
        payload:    { email_id: @email.id, tenant_id: @email.tenant_id }.compact,
        status:     "pending"
      )
      @email.update!(outbox_event_id: outbox.id)
      OutboxProcessorJob.perform_async(outbox.id)
      return result(:reenqueued, "created missing outbox event #{outbox.id}")
    end

    previous_status = outbox.status
    if previous_status != "pending"
      # Reset attempt_count so Sidekiq's exponential backoff starts fresh.
      # max_attempts is unchanged — the cap is still respected.
      outbox.update!(
        status:        "pending",
        last_error:    "[reconciler] reset from #{previous_status} at #{Time.current.iso8601}",
        attempt_count: 0,
        process_after: nil
      )
    end
    OutboxProcessorJob.perform_async(outbox.id)

    result(:reenqueued, "outbox was #{previous_status}")
  end

  def reconcile_sent
    sent_at = @email.sent_at || @email.created_at
    age     = Time.current - sent_at

    return result(:too_recent, "sent #{age.to_i}s ago, threshold=#{STALE_SENT_THRESHOLD.to_i}s") if age < STALE_SENT_THRESHOLD

    poll = ProviderStatusPoller.call(email: @email)

    if poll.found?
      @email.reload
      return result(:resynced, poll.summary)
    end

    if age > EXPIRED_SENT_THRESHOLD
      err = "reconciler:no_provider_events_after_#{EXPIRED_SENT_THRESHOLD.in_hours.to_i}h (poll=#{poll.summary})"
      @email.mark_failed!(error: err)
      return result(:marked_failed, err)
    end

    result(:still_pending, poll.summary)
  end

  def result(action, detail)
    Result.new(action: action, email: @email, detail: detail)
  end
end
