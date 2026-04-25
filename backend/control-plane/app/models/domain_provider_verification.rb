class DomainProviderVerification < ApplicationRecord
  belongs_to :domain
  belongs_to :provider_connection

  validates :provider, presence: true
  validates :provider_connection_id, uniqueness: { scope: :domain_id }
  validates :status,   presence: true, inclusion: { in: %w[pending verified failed] }

  before_validation :sync_provider_from_connection

  scope :verified, -> { where(status: "verified") }

  private

  # `provider` is denormalized from provider_connection.provider so simple
  # lookups don't need a join. Keeping them in sync here means callers can
  # set just provider_connection and the column fills itself.
  def sync_provider_from_connection
    self.provider ||= provider_connection&.provider
  end
end
