# frozen_string_literal: true

# Recovery + maintenance tasks for the OutboxEvent pipeline.
#
# Why these exist:
# Before the 2026-04-24 retry-handling fix, OutboxProcessorJob caught
# Faraday errors and reset events to `pending` without re-raising. Sidekiq
# saw a clean return and never re-enqueued the job, so events sat orphaned.
# The same shape can occur if a worker is killed mid-job after the atomic
# pending→processing transition. These tasks recover stuck events.

namespace :outbox do
  desc "Re-enqueue OutboxEvents stuck in `pending` (no in-flight Sidekiq job)"
  task requeue_orphaned: :environment do
    # `pending` events that are eligible to run now AND haven't reached
    # max_attempts. We can't directly query Sidekiq's retry set without the
    # web UI, so we re-enqueue and rely on the job's own atomic transition
    # to no-op if a competing worker grabs it first.
    scope = OutboxEvent.where(status: "pending", destination: "go_core")
                       .where("attempt_count < max_attempts")
                       .where("process_after IS NULL OR process_after <= ?", Time.current)

    count = 0
    scope.find_each do |event|
      OutboxProcessorJob.perform_async(event.id)
      count += 1
    end

    puts "[outbox:requeue_orphaned] Re-enqueued #{count} pending events"
  end

  desc "Re-enqueue events stuck in `processing` (worker died mid-flight)"
  task recover_stuck_processing: :environment do
    cutoff = 5.minutes.ago
    scope  = OutboxEvent.where(status: "processing", destination: "go_core")
                        .where("updated_at < ?", cutoff)

    count = scope.update_all(status: "pending", last_error: "recovered from stuck processing")
    OutboxEvent.where(status: "pending", destination: "go_core")
               .where("updated_at >= ?", 1.minute.ago)
               .find_each { |e| OutboxProcessorJob.perform_async(e.id) }

    puts "[outbox:recover_stuck_processing] Reset #{count} stuck-processing events to pending"
  end

  desc "Show outbox health summary"
  task health: :environment do
    puts "Outbox status counts:"
    OutboxEvent.group(:destination, :status).count.each do |(dest, status), n|
      puts "  #{dest.ljust(10)} #{status.ljust(12)} #{n}"
    end

    pending_old = OutboxEvent.where(status: "pending")
                             .where("created_at < ?", 10.minutes.ago)
                             .count
    puts ""
    puts "Pending events older than 10min: #{pending_old}"
  end
end

namespace :emails do
  desc "Re-attempt sends for emails stuck in `queued` with no live outbox event"
  task recover_queued: :environment do
    # Emails that are still queued but their OutboxEvent went `dead` or is
    # missing entirely. We rebuild the outbox event and re-enqueue.
    cutoff = 5.minutes.ago
    stuck  = Email.where(status: "queued").where("created_at < ?", cutoff)

    recovered = 0
    stuck.find_each do |email|
      live = OutboxEvent.where("payload->>'email_id' = ?", email.id)
                        .where(status: %w[pending processing])
                        .exists?
      next if live

      event = OutboxEvent.create!(
        event_type:  "send_email",
        destination: "go_core",
        status:      "pending",
        payload:     {
          email_id:        email.id,
          tenant_id:       email.tenant_id,
          idempotency_key: email.metadata&.dig("idempotency_key")
        }
      )
      OutboxProcessorJob.perform_async(event.id)
      recovered += 1
    end

    puts "[emails:recover_queued] Re-attempted #{recovered} stuck-queued emails"
  end

  desc "List emails marked sent>1h ago but never delivered"
  task report_undelivered: :environment do
    cutoff = 1.hour.ago
    stuck  = Email.where(status: "sent")
                  .where("sent_at < ?", cutoff)
                  .where(delivered_at: nil)
                  .order(sent_at: :asc)

    puts "Emails sent but undelivered (older than 1h): #{stuck.count}"
    stuck.limit(50).each do |e|
      age = ((Time.current - e.sent_at) / 3600).round(1)
      puts "  #{e.id}  to=#{e.to_email.ljust(35)} sent=#{e.sent_at.iso8601} age=#{age}h provider_msg_id=#{e.provider_message_id}"
    end
  end
end
