# frozen_string_literal: true

FactoryBot.define do
  factory :domain_provider_verification do
    domain
    provider_connection
    status { "verified" }
    verified_at { Time.current }

    after(:build) do |dpv|
      dpv.provider ||= dpv.provider_connection&.provider
    end

    trait :pending do
      status      { "pending" }
      verified_at { nil }
    end

    trait :failed do
      status      { "failed" }
      verified_at { nil }
    end
  end
end
