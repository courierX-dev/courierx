class Suppression < ApplicationRecord
  REASONS = %w[hard_bounce soft_bounce complaint unsubscribe manual].freeze

  belongs_to :tenant

  validates :email,  presence: true, uniqueness: { scope: :tenant_id }
  validates :reason, presence: true, inclusion: { in: REASONS }

  scope :bounces,    -> { where(reason: %w[hard_bounce soft_bounce]) }
  scope :complaints, -> { where(reason: "complaint") }

  def self.suppressed?(tenant_id, email)
    exists?(tenant_id: tenant_id, email: email.downcase.strip)
  end
end
