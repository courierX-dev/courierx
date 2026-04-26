# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderWebhookProvisioners::Resend do
  let(:tenant)     { create(:tenant) }
  let(:connection) do
    create(:provider_connection, :resend, tenant: tenant, api_key: "re_abc123")
  end

  before { stub_const("ENV", ENV.to_h.merge("PUBLIC_API_URL" => "https://api.example.test")) }

  describe "#provision" do
    it "creates a webhook on Resend and captures the signing secret" do
      stub_request(:post, "https://api.resend.com/webhooks")
        .with(
          headers: { "Authorization" => "Bearer re_abc123" },
          body: hash_including("endpoint_url" => connection.webhook_url)
        )
        .to_return(
          status: 201,
          body: { id: "whe_123", signing_secret: "whsec_zxc" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      result = described_class.new.provision(connection)

      expect(result).to include(
        success:        true,
        status:         "auto",
        external_id:    "whe_123",
        signing_secret: "whsec_zxc"
      )
    end

    it "returns failure when API key is missing" do
      connection.update_columns(encrypted_api_key: nil)
      # Re-fetch instead of reload — the original instance has the plaintext
      # api_key cached on @api_key from the factory's setter call.
      fresh = ProviderConnection.find(connection.id)
      result = described_class.new.provision(fresh)

      expect(result).to include(success: false, status: "failed")
      expect(result[:error]).to match(/api key/i)
    end

    it "returns failure on a Resend API error" do
      stub_request(:post, "https://api.resend.com/webhooks")
        .to_return(status: 401, body: { message: "Unauthorized" }.to_json)

      result = described_class.new.provision(connection)

      expect(result[:success]).to be false
      expect(result[:status]).to eq "failed"
      expect(result[:error]).to include("Resend")
    end
  end

  describe "#revoke" do
    it "deletes the webhook on Resend" do
      connection.update_columns(webhook_external_id: "whe_123")
      stub_request(:delete, "https://api.resend.com/webhooks/whe_123")
        .to_return(status: 200, body: "{}")

      result = described_class.new.revoke(connection)
      expect(result).to eq(success: true)
    end

    it "treats 404 as success (already gone)" do
      connection.update_columns(webhook_external_id: "whe_404")
      stub_request(:delete, "https://api.resend.com/webhooks/whe_404")
        .to_return(status: 404, body: "{}")

      result = described_class.new.revoke(connection)
      expect(result).to eq(success: true)
    end

    it "no-ops when there's no external_id" do
      result = described_class.new.revoke(connection)
      expect(result).to eq(success: true)
    end
  end
end
