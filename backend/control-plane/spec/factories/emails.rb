# frozen_string_literal: true

FactoryBot.define do
  factory :email do
    tenant
    from_email { "noreply@example.com" }
    to_email   { "user@example.com" }
    subject    { "Test Subject" }
    text_body  { "Hello World" }
    status     { "queued" }
    tags       { [] }
    metadata   { {} }

    trait :sent do
      status              { "sent" }
      sent_at             { Time.current }
      provider_message_id { "msg-#{SecureRandom.hex(8)}" }
    end

    trait :delivered do
      status       { "delivered" }
      sent_at      { 5.minutes.ago }
      delivered_at { Time.current }
    end

    trait :failed do
      status     { "failed" }
      last_error { "Provider returned 503" }
    end

    trait :bounced do
      status { "bounced" }
    end

    trait :suppressed do
      status { "suppressed" }
    end

    trait :with_html do
      html_body { "<p>Hello <strong>World</strong></p>" }
    end
  end
end
