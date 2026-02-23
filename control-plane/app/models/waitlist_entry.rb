class WaitlistEntry < ApplicationRecord
  STATUSES  = %w[pending approved invited].freeze
  USE_CASES = %w[transactional marketing both].freeze

  validates :email,         presence: true, uniqueness: { case_sensitive: false }
  validates :referral_code, presence: true, uniqueness: true
  validates :position,      presence: true, uniqueness: true
  validates :status,        presence: true, inclusion: { in: STATUSES }
  validates :use_case,      inclusion: { in: USE_CASES }, allow_blank: true

  scope :pending,  -> { where(status: "pending") }
  scope :approved, -> { where(status: "approved") }
  scope :by_position, -> { order(position: :asc) }

  before_validation :set_defaults, on: :create

  def referral_count
    self.class.where(referred_by: referral_code).count
  end

  def invite!
    update!(status: "invited", invited_at: Time.current)
  end

  def approve!
    update!(status: "approved")
  end

  private

  def set_defaults
    self.referral_code ||= "cx_#{SecureRandom.alphanumeric(8).downcase}"
    self.position      ||= (self.class.maximum(:position) || 0) + 1
    self.email = email&.downcase&.strip
  end
end
