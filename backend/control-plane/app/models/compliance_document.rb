class ComplianceDocument < ApplicationRecord
  belongs_to :compliance_profile

  validates :document_type, presence: true
  validates :file_name,     presence: true
  validates :s3_key,        presence: true
end
