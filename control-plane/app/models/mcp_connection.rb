class McpConnection < ApplicationRecord
  STATUSES    = %w[connected disconnected error].freeze
  PERMISSIONS = %w[read_only send_email manage_providers manage_suppressions full_access].freeze

  belongs_to :tenant

  validates :name,               presence: true
  validates :client_id,          presence: true, uniqueness: true
  validates :client_secret_hash, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :connected, -> { where(status: "connected") }

  def self.authenticate(client_id, client_secret)
    conn = find_by(client_id: client_id, status: "connected")
    return nil unless conn

    hash = Digest::SHA256.hexdigest(client_secret)
    return nil unless ActiveSupport::SecurityUtils.secure_compare(conn.client_secret_hash, hash)

    conn.touch(:last_used_at)
    conn
  end

  def can?(permission)
    permissions.include?("full_access") || permissions.include?(permission)
  end

  def increment_sent!
    increment!(:total_emails_sent)
  end
end
