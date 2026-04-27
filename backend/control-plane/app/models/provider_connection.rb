class ProviderConnection < ApplicationRecord
  PROVIDERS = %w[sendgrid mailgun aws_ses resend postmark smtp].freeze
  MODES     = %w[byok managed].freeze
  STATUSES  = %w[active inactive degraded banned].freeze

  # Providers we can auto-provision webhooks for via the provider's own API.
  # SES needs SNS topics + IAM permissions (out of scope for one-click); SMTP
  # has no webhook concept.
  AUTO_WEBHOOK_PROVIDERS = %w[resend postmark sendgrid mailgun].freeze

  # Webhook status lifecycle — see migration for descriptions.
  WEBHOOK_STATUSES = %w[not_configured auto manual failed needs_signing_key revoked].freeze

  belongs_to :tenant
  has_many   :routing_rule_providers, dependent: :destroy
  has_many   :routing_rules, through: :routing_rule_providers
  # Emails are an audit trail and must outlive the connection. Nullify the FK
  # on destroy so deleting a provider connection doesn't fail when historical
  # sends still reference it (and doesn't wipe the send history either).
  has_many   :emails, dependent: :nullify
  has_one    :provider_quota, dependent: :destroy
  has_many   :provider_quota_usages, dependent: :destroy
  has_many   :domain_provider_verifications, dependent: :destroy

  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :mode,     presence: true, inclusion: { in: MODES }
  validates :status,   presence: true, inclusion: { in: STATUSES }
  validates :weight,   presence: true, numericality: { greater_than: 0 }
  validates :priority,     presence: true, numericality: { greater_than: 0 }
  validates :display_name, presence: true
  validates :provider, uniqueness: { scope: [:tenant_id, :mode, :display_name],
                                     message: "A connection with this provider and name already exists" }

  scope :active,      -> { where(status: "active") }
  scope :by_priority, -> { order(priority: :asc) }

  # ── Virtual credential attributes ──────────────────────────────────────────
  # Clients set connection.api_key = "plaintext" and connection.secret = "plaintext".
  # Values are encrypted with AES-256 (ActiveSupport::MessageEncryptor) before save
  # and decrypted transparently on read. The raw plaintext is never persisted.

  attr_writer :api_key, :secret, :webhook_secret

  before_validation :ensure_webhook_token
  before_save       :encrypt_credentials

  def api_key
    @api_key ||= decrypt_field(encrypted_api_key)
  end

  def secret
    @secret ||= decrypt_field(encrypted_secret)
  end

  # Provider-specific webhook signing secret (Resend's `whsec_...`,
  # Postmark Basic Auth password, etc.). Tenants paste it in after creating
  # the webhook in their provider's dashboard. Stored encrypted at rest.
  def webhook_secret
    @webhook_secret ||= decrypt_field(encrypted_webhook_secret)
  end

  # Public webhook URL we hand the tenant — either pasted into their provider
  # dashboard (manual) or registered with the provider's API on their behalf
  # (auto). Built on read so a base-URL change doesn't require a backfill.
  #
  # If webhook_token is missing (legacy row from before token generation was
  # added), generate and persist one in-line so the URL is always available.
  def webhook_url(base_url: ENV["PUBLIC_API_URL"])
    return nil if base_url.blank?
    return nil unless AUTO_WEBHOOK_PROVIDERS.include?(provider)

    if webhook_token.blank?
      ensure_webhook_token
      save!(validate: false) if persisted?
    end

    "#{base_url.chomp('/')}/api/v1/webhooks/#{provider}/#{webhook_token}"
  end

  # ── Public helpers ──────────────────────────────────────────────────────────

  def healthy?
    consecutive_failures < 5 && status == "active"
  end

  # Live success rate / latency / volume computed from the emails table over a
  # rolling window. The persisted `success_rate` / `avg_latency_ms` columns
  # only reflect verify-call health checks, not actual send outcomes — this
  # is what the dashboard surfaces.
  def live_stats(window: 24.hours)
    scope     = emails.where("emails.created_at >= ?", window.ago)
    delivered = scope.where(status: %w[sent delivered]).count
    failed    = scope.where(status: %w[bounced complained failed]).count
    total     = delivered + failed

    latency_ms = scope.where.not(sent_at: nil).pluck(
      Arel.sql("EXTRACT(EPOCH FROM (sent_at - queued_at)) * 1000")
    )
    avg_latency = latency_ms.any? ? (latency_ms.sum / latency_ms.size).round : nil

    {
      success_rate:    total.positive? ? (delivered.to_f / total) : nil,
      avg_latency_ms:  avg_latency,
      sent_count:      delivered,
      failed_count:    failed,
      window_hours:    (window / 3600).to_i
    }
  end

  # True when CourierX is the source of truth for this connection's webhook
  # configuration on the provider side. Used to decide whether destroy should
  # call the provider's delete-webhook API before tearing down the record.
  def webhook_auto?
    webhook_auto_managed? && webhook_external_id.present?
  end

  # Public-facing summary of the webhook setup. Frontend renders a status pill
  # and conditionally shows "Resync" / "Set up automatically" buttons.
  def webhook_summary(base_url: ENV.fetch("PUBLIC_API_URL", nil))
    return nil unless AUTO_WEBHOOK_PROVIDERS.include?(provider)

    {
      status:         webhook_status,
      auto_managed:   webhook_auto_managed,
      url:            webhook_url(base_url: base_url),
      external_id:    webhook_external_id,
      last_error:     webhook_last_error,
      last_synced_at: webhook_last_synced_at,
      secret_present: encrypted_webhook_secret.present?,
      supports_auto:  true
    }
  end

  private

  def ensure_webhook_token
    return if webhook_token.present?
    self.webhook_token = SecureRandom.urlsafe_base64(24).tr("-_", "ab")
  end

  def encrypt_credentials
    self.encrypted_api_key        = encryptor.encrypt_and_sign(@api_key)        if @api_key.present?
    self.encrypted_secret         = encryptor.encrypt_and_sign(@secret)         if @secret.present?
    self.encrypted_webhook_secret = encryptor.encrypt_and_sign(@webhook_secret) if @webhook_secret.present?
  end

  def decrypt_field(value)
    return nil if value.blank?
    encryptor.decrypt_and_verify(value)
  rescue ActiveSupport::MessageEncryptor::InvalidMessage,
         ActiveSupport::MessageVerifier::InvalidSignature
    nil
  end

  def encryptor
    @encryptor ||= begin
      key_base = ENV.fetch("ENCRYPTION_KEY") { Rails.application.secret_key_base }
      # Derive a 32-byte key scoped to provider credentials
      key = ActiveSupport::KeyGenerator.new(key_base)
                                       .generate_key("provider_credentials", 32)
      ActiveSupport::MessageEncryptor.new(key)
    end
  end
end
