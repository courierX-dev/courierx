class Tenant < ApplicationRecord
  # ── Associations ──
  has_many :api_keys,              dependent: :destroy
  has_one  :rate_limit_policy,     dependent: :destroy
  has_many :provider_connections,   dependent: :destroy
  has_many :domains,               dependent: :destroy
  has_many :routing_rules,         dependent: :destroy
  has_one  :compliance_profile,    dependent: :destroy
  has_many :suppressions,          dependent: :destroy
  has_many :emails,                dependent: :destroy
  has_many :webhook_endpoints,     dependent: :destroy
  has_many :mcp_connections,       dependent: :destroy
  has_many :usage_stats,           dependent: :destroy

  # ── Validations ──
  validates :name,  presence: true
  validates :slug,  presence: true, uniqueness: true,
                    format: { with: /\A[a-z0-9\-]+\z/, message: "only lowercase letters, numbers, and hyphens" }
  validates :email, presence: true, uniqueness: true
  validates :mode,   presence: true, inclusion: { in: %w[demo byok managed] }
  validates :status, presence: true, inclusion: { in: %w[active suspended pending_compliance] }

  # ── Scopes ──
  scope :active,    -> { where(status: "active") }
  scope :demo,      -> { where(mode: "demo") }
  scope :managed,   -> { where(mode: "managed") }

  # ── Callbacks ──
  before_validation :generate_slug, on: :create

  private

  def generate_slug
    return if self.slug.present?
    
    base_slug = name&.parameterize
    self.slug = base_slug
    
    # Ensure uniqueness
    if Tenant.exists?(slug: base_slug)
      self.slug = "#{base_slug}-#{SecureRandom.hex(3)}"
    end
  end
end
