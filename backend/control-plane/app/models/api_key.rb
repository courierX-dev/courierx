class ApiKey < ApplicationRecord
  belongs_to :tenant

  validates :name,       presence: true
  validates :key_hash,   presence: true, uniqueness: true
  validates :key_prefix, presence: true
  validates :status, presence: true, inclusion: { in: %w[active revoked expired] }

  scope :active,  -> { where(status: "active") }
  scope :revoked, -> { where(status: "revoked") }

  # ── Class methods ──

  def self.authenticate(raw_key)
    hash = Digest::SHA256.hexdigest(raw_key)
    active.find_by(key_hash: hash)&.tap { |k| k.touch(:last_used_at) }
  end

  # ── Instance methods ──

  def revoke!
    update!(status: "revoked")
  end

  def expired?
    expires_at.present? && expires_at < Time.current
  end
end
