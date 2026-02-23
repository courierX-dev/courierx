class WebhookEndpoint < ApplicationRecord
  belongs_to :tenant
  has_many   :webhook_deliveries, dependent: :destroy

  validates :url,    presence: true
  validates :secret, presence: true

  scope :active, -> { where(is_active: true) }

  def subscribed_to?(event_type)
    events.blank? || events.include?(event_type)
  end
end
