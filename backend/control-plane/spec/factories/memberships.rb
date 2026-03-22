FactoryBot.define do
  factory :membership do
    user { nil }
    tenant { nil }
    role { "MyString" }
  end
end
