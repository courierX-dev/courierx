class ManagedSubAccount < ApplicationRecord
  has_many :provider_connections, dependent: :nullify

  validates :provider,    presence: true, inclusion: { in: %w[sendgrid mailgun aws_ses resend postmark smtp] }
  validates :external_id, presence: true, uniqueness: { scope: :provider }
  validates :encrypted_api_key,    presence: true
  validates :encrypted_api_key_iv, presence: true
  validates :status, presence: true, inclusion: { in: %w[active inactive degraded banned] }

  scope :active, -> { where(status: "active") }
end
