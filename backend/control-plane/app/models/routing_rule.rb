class RoutingRule < ApplicationRecord
  STRATEGIES = %w[priority weighted round_robin failover_only].freeze

  belongs_to :tenant
  has_many   :routing_rule_providers, dependent: :destroy
  has_many   :provider_connections, through: :routing_rule_providers

  validates :name,     presence: true
  validates :strategy, presence: true, inclusion: { in: STRATEGIES }

  scope :active,       -> { where(is_active: true) }
  scope :default_rule, -> { where(is_default: true) }
end
