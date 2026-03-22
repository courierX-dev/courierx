class EmailEvent < ApplicationRecord
  EVENT_TYPES = %w[delivered bounced complained opened clicked unsubscribed failed].freeze

  belongs_to :email

  validates :event_type,  presence: true, inclusion: { in: EVENT_TYPES }
  validates :occurred_at, presence: true
  validates :provider,    presence: true

  scope :deliveries,  -> { where(event_type: "delivered") }
  scope :bounces,     -> { where(event_type: "bounced") }
  scope :opens,       -> { where(event_type: "opened") }
  scope :clicks,      -> { where(event_type: "clicked") }
  scope :complaints,  -> { where(event_type: "complained") }
  scope :since,       ->(t) { where("occurred_at >= ?", t) }
end
