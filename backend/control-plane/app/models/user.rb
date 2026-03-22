class User < ApplicationRecord
  has_many :memberships, dependent: :destroy
  has_many :tenants, through: :memberships

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }

  before_save { email&.downcase! }

  def full_name
    [first_name, last_name].compact_blank.join(" ").presence
  end
end
