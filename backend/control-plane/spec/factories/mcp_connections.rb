# frozen_string_literal: true

FactoryBot.define do
  factory :mcp_connection do
    tenant
    name { "MCP Connection #{SecureRandom.hex(3)}" }
    client_id { "mcp_#{SecureRandom.hex(16)}" }
    status   { "connected" }
    permissions { %w[full_access] }

    transient do
      raw_secret { SecureRandom.hex(32) }
    end

    client_secret_hash { Digest::SHA256.hexdigest(raw_secret) }

    # Expose the plaintext secret on the built record so specs can authenticate.
    after(:build) do |conn, evaluator|
      conn.define_singleton_method(:raw_secret) { evaluator.raw_secret }
    end
  end
end
