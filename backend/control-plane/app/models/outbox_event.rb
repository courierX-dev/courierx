class OutboxEvent < ApplicationRecord
  STATUSES = %w[pending processing processed failed dead].freeze

  validates :event_type, presence: true
  validates :status,     presence: true, inclusion: { in: STATUSES }

  scope :pending,    -> { where(status: "pending") }
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
      update!(
        status: "pending",
        last_error: error,
        process_after: Time.current + (2**attempt_count).minutes
      )
    end
  end
end
