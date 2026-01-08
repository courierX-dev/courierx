# frozen_string_literal: true

FactoryBot.define do
  factory :tenant do
    name { Faker::Company.name }
    slug { name.parameterize }
    status { 'active' }
    settings { {} }
    deleted_at { nil }

    trait :suspended do
      status { 'suspended' }
    end

    trait :deleted do
      status { 'deleted' }
      deleted_at { Time.current }
    end

    trait :with_users do
      after(:create) do |tenant|
        create_list(:user, 3, tenant: tenant)
      end
    end

    trait :with_products do
      after(:create) do |tenant|
        create_list(:product, 2, tenant: tenant)
      end
    end
  end
end
