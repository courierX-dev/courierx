# frozen_string_literal: true

FactoryBot.define do
  factory :outbox_event do
    event_type    { "send_email" }
    status        { "pending" }
    payload       { {} }
    attempt_count { 0 }
    max_attempts  { 5 }

    trait :processing do
      status        { "processing" }
      attempt_count { 1 }
    end

    trait :processed do
      status       { "processed" }
      processed_at { Time.current }
    end

    trait :failed do
      status     { "failed" }
      last_error { "Go engine returned 503" }
    end

    trait :dead do
      status        { "dead" }
      attempt_count { 5 }
      last_error    { "All retries exhausted" }
    end

    trait :for_email do
      transient do
        email { nil }
      end

      after(:build) do |event, evaluator|
        if evaluator.email
          event.payload = {
            "email_id"  => evaluator.email.id,
            "tenant_id" => evaluator.email.tenant_id
          }
        end
      end
    end
  end
end
