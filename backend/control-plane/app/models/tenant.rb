class Tenant < ApplicationRecord
  include PublishesCloudEvents

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
  after_commit :publish_tenant_created_event, on: :create
  after_commit :publish_tenant_updated_event, on: :update, if: :saved_change_to_cloud_relevant_attrs?

  # First-party open/click tracking toggles. Stored under settings["tracking"]
  # so we don't carry a migration for two booleans. Default = on; tenants opt
  # out for privacy reasons rather than opting in.
  def tracking_opens?
    settings.dig("tracking", "opens") != false
  end

  def tracking_clicks?
    settings.dig("tracking", "clicks") != false
  end

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

  CLOUD_RELEVANT_ATTRS = %w[name email status mode].freeze

  def saved_change_to_cloud_relevant_attrs?
    (saved_changes.keys & CLOUD_RELEVANT_ATTRS).any?
  end

  def cloud_projection
    { id: id, name: name, email: email, status: status, mode: mode, created_at: created_at }
  end

  def publish_tenant_created_event
    publish_cloud_event("tenant.created", cloud_projection)
  end

  def publish_tenant_updated_event
    publish_cloud_event("tenant.updated", cloud_projection)
  end

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
