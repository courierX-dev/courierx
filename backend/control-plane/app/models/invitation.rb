# frozen_string_literal: true

class Invitation < ApplicationRecord
  STATUSES = %w[pending accepted revoked expired].freeze

  belongs_to :tenant
  belongs_to :invited_by, class_name: "User"

  validates :email,  presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role,   presence: true, inclusion: { in: Membership::ROLES }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :token,  presence: true, uniqueness: true

  before_validation :generate_token, on: :create
  before_validation :set_default_expiry, on: :create
  before_save :downcase_email

  scope :pending,  -> { where(status: "pending") }
  scope :active,   -> { pending.where("expires_at > ?", Time.current) }
  scope :recent,   -> { order(created_at: :desc) }

  def expired?
    expires_at <= Time.current
  end

  def can_accept?
    status == "pending" && !expired?
  end

  def accept!(user)
    return false unless can_accept?

    transaction do
      tenant.memberships.create!(user: user, role: role)
      update!(status: "accepted", accepted_at: Time.current)
    end
    true
  end

  def revoke!
    update!(status: "revoked")
  end

  private

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_default_expiry
    self.expires_at ||= 7.days.from_now
  end

  def downcase_email
    self.email = email.to_s.downcase.strip
  end
end
