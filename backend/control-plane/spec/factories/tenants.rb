# frozen_string_literal: true

FactoryBot.define do
  factory :tenant do
    name { "Tenant #{SecureRandom.hex(4)}" }
    slug { "tenant-#{SecureRandom.hex(4)}" }
    email { "tenant-#{SecureRandom.hex(4)}@example.com" }
    password { "password123" }
    mode { "demo" }
    status { "active" }
    settings { {} }

    trait :suspended do
      status { "suspended" }
    end

    trait :byok do
      mode { "byok" }
    end
  end
end
