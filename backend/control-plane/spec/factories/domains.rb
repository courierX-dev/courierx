# frozen_string_literal: true

FactoryBot.define do
  factory :domain do
    tenant
    domain             { "example-#{SecureRandom.hex(4)}.com" }
    status             { "verified" }
    verification_token { SecureRandom.hex(16) }
    verified_at        { Time.current }

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
