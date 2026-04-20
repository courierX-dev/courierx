# frozen_string_literal: true

FactoryBot.define do
  factory :routing_rule do
    tenant
    name       { "Default Rule" }
    strategy   { "priority" }
    is_active  { true }
    is_default { false }

    trait :default do
      is_default { true }
    end

    trait :inactive do
      is_active { false }
    end
  end

  factory :routing_rule_provider do
    routing_rule
    provider_connection
    priority     { 1 }
    weight       { 100 }
    failover_only { false }
  end
end
