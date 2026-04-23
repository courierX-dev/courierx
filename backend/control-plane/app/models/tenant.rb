class Tenant < ApplicationRecord
  has_secure_password

  # ── Associations ──
  has_many :api_keys,              dependent: :destroy
  has_one  :rate_limit_policy,     dependent: :destroy
  has_many :provider_connections,   dependent: :destroy
  has_many :domains,               dependent: :destroy
  has_many :routing_rules,         dependent: :destroy
  has_many :suppressions,          dependent: :destroy
  has_many :emails,                dependent: :destroy
  has_many :webhook_endpoints,     dependent: :destroy
  has_many :mcp_connections,       dependent: :destroy
  has_many :usage_stats,           dependent: :destroy
  has_many :email_templates,       dependent: :destroy
  has_many :memberships,           dependent: :destroy
  has_many :users,                 through:   :memberships
  has_many :invitations,           dependent: :destroy

  # ── Validations ──
  validates :password, length: { minimum: 8 }, on: :create
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

  # Promote demo → byok if all prerequisites are now met. Only called from
  # the explicit activation path (email-verification hook or admin action);
  # never from model callbacks, so "demo" is a deliberate state the user
  # exits on purpose.
  def maybe_auto_activate!
    return unless mode == "demo"
    return unless domains.where(status: "verified").exists?
    return unless provider_connections.where(status: "active").exists?
    return unless routing_rules.where(is_default: true).exists?

    update!(mode: "byok")
  end

  private

  def generate_slug
    return if self.slug.present?

    base_slug = name&.parameterize
    candidate = base_slug

    # Reduce the TOCTOU window by checking before assignment; the DB unique
    # index is the definitive guard — any residual race surfaces as a
    # validation error rather than a 500.
    loop do
      break unless Tenant.exists?(slug: candidate)
      candidate = "#{base_slug}-#{SecureRandom.hex(3)}"
    end

    self.slug = candidate
  end
end
