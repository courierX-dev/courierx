class Domain < ApplicationRecord
  belongs_to :tenant
  has_many   :domain_provider_verifications, dependent: :destroy
  has_many   :emails

  validates :domain, presence: true, uniqueness: { scope: :tenant_id }
  validates :status, presence: true, inclusion: { in: %w[pending pending_verification verified failed] }

  scope :verified, -> { where(status: "verified") }
  scope :pending,  -> { where(status: "pending") }

  before_create :generate_verification_token
  after_save    :auto_activate_tenant, if: :saved_change_to_status?

  def verify!
    update!(status: "verified", verified_at: Time.current)
  end

  private

  def auto_activate_tenant
    tenant&.maybe_auto_activate! if status == "verified"
  end

  def generate_verification_token
    self.verification_token ||= SecureRandom.hex(32)
  end
end
