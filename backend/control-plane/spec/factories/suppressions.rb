# frozen_string_literal: true

FactoryBot.define do
  factory :suppression do
    tenant
    email  { "suppressed-#{SecureRandom.hex(4)}@example.com" }
    reason { "hard_bounce" }

    trait :complaint do
      reason { "complaint" }
    end

    trait :unsubscribe do
      reason { "unsubscribe" }
    end

    trait :manual do
      reason { "manual" }
    end
  end
end
