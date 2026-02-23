class ComplianceProfile < ApplicationRecord
  STATUSES = %w[pending under_review approved rejected].freeze

  belongs_to :tenant
  has_many   :compliance_documents, dependent: :destroy

  validates :tenant_id, uniqueness: true
  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :pending, -> { where(status: "pending") }
  scope :approved, -> { where(status: "approved") }

  def submit!
    update!(status: "under_review", submitted_at: Time.current)
  end

  def approve!(reviewer_id:, note: nil)
    update!(status: "approved", reviewed_at: Time.current, reviewed_by: reviewer_id, review_note: note)
  end

  def reject!(reviewer_id:, note:)
    update!(status: "rejected", reviewed_at: Time.current, reviewed_by: reviewer_id, review_note: note)
  end
end
