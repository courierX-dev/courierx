class UsageStat < ApplicationRecord
  belongs_to :tenant

  validates :date,   presence: true
  validates :date,   uniqueness: { scope: [:tenant_id, :provider] }

  scope :for_date_range, ->(from, to) { where(date: from..to) }
  scope :combined,       -> { where(provider: nil) }
  scope :by_provider,    ->(p) { where(provider: p) }

  def self.for_period(tenant_id, from:, to:)
    where(tenant_id: tenant_id)
      .for_date_range(from, to)
      .combined
      .order(date: :asc)
  end
end
