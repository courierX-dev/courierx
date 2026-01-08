# frozen_string_literal: true

FactoryBot.define do
  factory :product do
    tenant
    name { Faker::App.name }
    api_key_id { "prod_#{SecureRandom.hex(16)}" }
    status { 'active' }
    rate_limit { 1000 }
    settings { {} }

    trait :paused do
      status { 'paused' }
    end

    trait :unlimited do
      rate_limit { nil }
    end

    trait :with_api_keys do
      after(:create) do |product|
        create_list(:api_key, 2, product: product)
      end
    end
  end
end
