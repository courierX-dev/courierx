# frozen_string_literal: true

FactoryBot.define do
  factory :provider_connection do
    tenant
    provider { "sendgrid" }
    mode { "byok" }
    status { "active" }
    weight { 100 }
    priority { 1 }
    api_key { "test_api_key_#{SecureRandom.hex(8)}" }
    display_name { nil }
    consecutive_failures { 0 }

    trait :mailgun do
      provider { "mailgun" }
      smtp_host { "mg.example.com" }
      region { "us" }
    end

    trait :ses do
      provider { "aws_ses" }
      secret { "test_secret_key_#{SecureRandom.hex(16)}" }
      region { "us-east-1" }
    end

    trait :smtp do
      provider { "smtp" }
      smtp_host { "smtp.example.com" }
      smtp_port { 587 }
      secret { "smtp_password" }
    end

    trait :resend do
      provider { "resend" }
    end

    trait :postmark do
      provider { "postmark" }
    end

    trait :inactive do
      status { "inactive" }
    end
  end
end
