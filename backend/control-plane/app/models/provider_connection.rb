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

  attr_writer :api_key, :secret

  before_save :encrypt_credentials

  def api_key
    @api_key ||= decrypt_field(encrypted_api_key)
  end

  def secret
    @secret ||= decrypt_field(encrypted_secret)
  end

  # ── Public helpers ──────────────────────────────────────────────────────────

  def healthy?
    consecutive_failures < 5 && status == "active"
  end

  private

  def encrypt_credentials
    self.encrypted_api_key = encryptor.encrypt_and_sign(@api_key) if @api_key.present?
    self.encrypted_secret  = encryptor.encrypt_and_sign(@secret)  if @secret.present?
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
