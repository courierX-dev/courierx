class OutboxEvent < ApplicationRecord
  STATUSES     = %w[pending processing processed failed dead].freeze
  DESTINATIONS = %w[go_core cloud].freeze

  validates :event_type,  presence: true
  validates :status,      presence: true, inclusion: { in: STATUSES }
  validates :destination, presence: true, inclusion: { in: DESTINATIONS }

  scope :for_go_core, -> { where(destination: "go_core") }
  scope :for_cloud,   -> { where(destination: "cloud") }
  scope :pending,     -> { where(status: "pending") }
  scope :processable, -> {
    pending
      .where("process_after IS NULL OR process_after <= ?", Time.current)
      .where("attempt_count < max_attempts")
      .order(created_at: :asc)
  }

  def process!
    update!(status: "processing", attempt_count: attempt_count + 1)
  end

  def complete!
    update!(status: "processed", processed_at: Time.current)
  end

  def fail!(error)
    if attempt_count >= max_attempts
      update!(status: "dead", last_error: error)
    else
      # Reset to pending without a delay — Sidekiq's own exponential backoff
      # is the sole retry schedule. Setting process_after here stacks a second
      # delay on top of Sidekiq's, causing backoff to grow faster than intended.
      update!(status: "pending", last_error: error)
    end
  end
end
