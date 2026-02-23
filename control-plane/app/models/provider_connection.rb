class ProviderConnection < ApplicationRecord
  PROVIDERS = %w[sendgrid mailgun aws_ses resend postmark smtp].freeze
  MODES     = %w[byok managed].freeze
  STATUSES  = %w[active inactive degraded banned].freeze

  belongs_to :tenant
  belongs_to :managed_sub_account, optional: true
  has_many   :routing_rule_providers, dependent: :destroy
  has_many   :routing_rules, through: :routing_rule_providers
  has_many   :emails

  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :mode,     presence: true, inclusion: { in: MODES }
  validates :status,   presence: true, inclusion: { in: STATUSES }
  validates :weight,   presence: true, numericality: { greater_than: 0 }
  validates :priority, presence: true, numericality: { greater_than: 0 }
  validates :provider, uniqueness: { scope: [:tenant_id, :mode] }

  scope :active,   -> { where(status: "active") }
  scope :by_priority, -> { order(priority: :asc) }

  def healthy?
    consecutive_failures < 5 && status == "active"
  end
end
