class RateLimitPolicy < ApplicationRecord
  belongs_to :tenant

  validates :max_per_minute, :max_per_hour, :max_per_day, :max_per_month,
            presence: true, numericality: { greater_than: 0 }
  validates :tenant_id, uniqueness: true
end
