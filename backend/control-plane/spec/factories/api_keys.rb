# frozen_string_literal: true

FactoryBot.define do
  factory :api_key do
    tenant
    name   { "Test API Key" }
    status { "active" }

    transient do
      raw { "cxk_test_#{SecureRandom.hex(32)}" }
    end

    key_prefix { raw[0, 8] }
    key_hash   { Digest::SHA256.hexdigest(raw) }

    # Expose the raw (unhashed) key via a singleton method so specs can use it
    # for authentication headers without storing it in the DB.
    after(:create) do |key, evaluator|
      key.instance_variable_set(:@raw_key, evaluator.raw)
      key.define_singleton_method(:raw_key) { @raw_key }
    end

    trait :expired do
      expires_at { 1.hour.ago }
      status     { "expired" }
    end

    trait :revoked do
      status { "revoked" }
    end

    trait :expiring_soon do
      expires_at { 1.hour.from_now }
    end
  end
end
