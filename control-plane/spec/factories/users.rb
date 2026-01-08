# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    tenant
    email { Faker::Internet.email }
    password { 'SecurePassword123!' }
    password_confirmation { 'SecurePassword123!' }
    first_name { Faker::Name.first_name }
    last_name { Faker::Name.last_name }
    role { 'developer' }
    deleted_at { nil }

    trait :owner do
      role { 'owner' }
    end

    trait :admin do
      role { 'admin' }
    end

    trait :viewer do
      role { 'viewer' }
    end

    trait :deleted do
      deleted_at { Time.current }
    end
  end
end
