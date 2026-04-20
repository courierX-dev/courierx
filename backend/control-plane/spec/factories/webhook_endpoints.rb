# frozen_string_literal: true

FactoryBot.define do
  factory :webhook_endpoint do
    tenant
    url       { "https://hooks.example.com/webhook-#{SecureRandom.hex(4)}" }
    secret    { SecureRandom.hex(32) }
    is_active { true }
    events    { [] }

    trait :inactive do
      is_active { false }
    end

    trait :with_events do
      events { %w[delivered bounced complained] }
    end
  end
end
