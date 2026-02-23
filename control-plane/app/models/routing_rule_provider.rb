class RoutingRuleProvider < ApplicationRecord
  belongs_to :routing_rule
  belongs_to :provider_connection

  validates :priority, presence: true, numericality: { greater_than: 0 }
  validates :weight,   presence: true, numericality: { greater_than: 0 }
  validates :provider_connection_id, uniqueness: { scope: :routing_rule_id }

  scope :by_priority, -> { order(priority: :asc) }
  scope :primary,     -> { where(failover_only: false) }
  scope :failover,    -> { where(failover_only: true) }
end
