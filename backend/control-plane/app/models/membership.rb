class Membership < ApplicationRecord
  ROLES = %w[owner admin developer viewer].freeze

  belongs_to :user
  belongs_to :tenant

  validates :role, presence: true, inclusion: { in: ROLES }
  validates :user_id, uniqueness: { scope: :tenant_id, message: "is already a member of this tenant" }
end
