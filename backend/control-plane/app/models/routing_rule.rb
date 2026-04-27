class RoutingRule < ApplicationRecord
  STRATEGIES = %w[priority weighted round_robin failover_only].freeze

  belongs_to :tenant
  has_many   :routing_rule_providers, dependent: :destroy
  has_many   :provider_connections, through: :routing_rule_providers

  validates :name,     presence: true
  validates :strategy, presence: true, inclusion: { in: STRATEGIES }
  validate  :only_one_default_per_tenant

  scope :active,       -> { where(is_active: true) }
  scope :default_rule, -> { where(is_default: true) }

  private

  # Two rules flagged is_default for the same tenant means EligibleConnections
  # Resolver picks whichever Postgres returns first — production hit this on
  # 2026-04-26 with two defaults, the empty older one winning, every send
  # rejecting "no verified provider". Block creation/update at the model layer.
  def only_one_default_per_tenant
    return unless is_default
    return unless tenant_id

    existing = self.class.where(tenant_id: tenant_id, is_default: true)
    existing = existing.where.not(id: id) if persisted?

    if existing.exists?
      errors.add(:is_default, "another default routing rule already exists for this tenant")
    end
  end
end
