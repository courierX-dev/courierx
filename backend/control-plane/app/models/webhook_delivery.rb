class WebhookDelivery < ApplicationRecord
  belongs_to :webhook_endpoint

  scope :failed,  -> { where(success: false) }
  scope :retryable, -> {
    failed.where("next_retry_at IS NOT NULL AND next_retry_at <= ?", Time.current)
  }

  def mark_success!(status:, body:)
    update!(success: true, response_status: status, response_body: body, delivered_at: Time.current)
  end

  def mark_failed!(status:, body:)
    update!(
      success: false,
      response_status: status,
      response_body: body,
      attempt_count: attempt_count + 1,
      next_retry_at: Time.current + (2**attempt_count).minutes
    )
  end
end
