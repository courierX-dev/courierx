class Email < ApplicationRecord
  STATUSES = %w[queued sent delivered bounced complained failed suppressed].freeze

  belongs_to :tenant
  belongs_to :provider_connection, optional: true
  belongs_to :domain,              optional: true
  belongs_to :mcp_connection,      optional: true
  belongs_to :email_template,      optional: true
  has_many   :email_events, dependent: :destroy

  belongs_to :outbox_event, optional: true

  before_validation { self.to_email = to_email&.downcase&.strip }

  validates :from_email, presence: true
  validates :to_email,   presence: true
  validates :subject,    presence: true
  validates :status,     presence: true, inclusion: { in: STATUSES }

  scope :by_status, ->(s) { where(status: s) }
  scope :recent,    -> { order(created_at: :desc) }
  scope :sent_today, -> { where("created_at >= ?", Time.current.beginning_of_day) }

  def mark_sent!(provider_message_id:, provider_connection:)
    update!(
      status: "sent",
      sent_at: Time.current,
      provider_message_id: provider_message_id,
      provider_connection: provider_connection
    )
  end

  def mark_delivered!
    update!(status: "delivered", delivered_at: Time.current)
  end

  def mark_bounced!(error: nil)
    update!(status: "bounced", last_error: error)
  end

  def mark_failed!(error:)
    update!(status: "failed", last_error: error, attempt_count: attempt_count + 1)
  end
end
