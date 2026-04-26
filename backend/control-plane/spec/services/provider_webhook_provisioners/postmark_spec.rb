# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderWebhookProvisioners::Postmark do
  let(:tenant)     { create(:tenant) }
  let(:connection) do
    create(:provider_connection, :postmark, tenant: tenant, api_key: "pm-server-token-abc")
  end

  before { stub_const("ENV", ENV.to_h.merge("PUBLIC_API_URL" => "https://api.example.test")) }

  describe "#provision" do
    it "creates a webhook with HttpAuth credentials it generates" do
      stub_request(:post, "https://api.postmarkapp.com/webhooks")
        .with(headers: { "X-Postmark-Server-Token" => "pm-server-token-abc" })
        .to_return(
          status: 200,
          body: { "ID" => 42 }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      result = described_class.new.provision(connection)

      expect(result[:success]).to be true
      expect(result[:status]).to eq "auto"
      expect(result[:external_id]).to eq "42"
      # Postmark doesn't sign payloads — the provisioner stores its own
      # generated Basic Auth password as the "secret".
      expect(result[:signing_secret]).to be_present
      expect(result[:signing_secret].length).to be >= 16
    end

    it "returns failure on Postmark API error" do
      stub_request(:post, "https://api.postmarkapp.com/webhooks")
        .to_return(status: 422, body: { "Message" => "Bad Request" }.to_json)

      result = described_class.new.provision(connection)
      expect(result[:success]).to be false
      expect(result[:error]).to include("Postmark")
    end
  end

  describe "#revoke" do
    it "deletes the webhook by ID" do
      connection.update_columns(webhook_external_id: "42")
      stub_request(:delete, "https://api.postmarkapp.com/webhooks/42")
        .to_return(status: 200, body: "{}")

      expect(described_class.new.revoke(connection)).to eq(success: true)
    end
  end
end
