class DomainProviderVerification < ApplicationRecord
  belongs_to :domain

  validates :provider, presence: true, uniqueness: { scope: :domain_id }
  validates :status,   presence: true, inclusion: { in: %w[pending verified failed] }

  scope :verified, -> { where(status: "verified") }
end
