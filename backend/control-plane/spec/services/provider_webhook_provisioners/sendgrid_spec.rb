# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderWebhookProvisioners::Sendgrid do
  let(:tenant)     { create(:tenant) }
  let(:connection) do
    create(:provider_connection, tenant: tenant, provider: "sendgrid", api_key: "SG.token")
  end

  before { stub_const("ENV", ENV.to_h.merge("PUBLIC_API_URL" => "https://api.example.test")) }

  describe "#provision" do
    it "configures the event webhook URL and enables signed payloads" do
      stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .with(headers: { "Authorization" => "Bearer SG.token" })
        .to_return(status: 200, body: { url: connection.webhook_url }.to_json)

      stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings/signed")
        .with(headers: { "Authorization" => "Bearer SG.token" }, body: { enabled: true }.to_json)
        .to_return(
          status: 200,
          body: { public_key: "BASE64-ECDSA-KEY" }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

      result = described_class.new.provision(connection)
      expect(result[:success]).to be true
      expect(result[:status]).to eq "auto"
      expect(result[:external_id]).to eq "account"
      expect(result[:signing_secret]).to eq "BASE64-ECDSA-KEY"
    end

    it "marks needs_signing_key when signed-webhooks endpoint refuses" do
      stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .to_return(status: 200, body: "{}")
      stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings/signed")
        .to_return(status: 403, body: "{}")

      result = described_class.new.provision(connection)
      expect(result[:success]).to be true
      expect(result[:status]).to eq "needs_signing_key"
      expect(result[:signing_secret]).to be_nil
    end

    it "returns failure when configure-event-webhook fails" do
      stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .to_return(status: 401, body: { errors: [ { message: "bad creds" } ] }.to_json)

      result = described_class.new.provision(connection)
      expect(result[:success]).to be false
    end
  end

  describe "#revoke" do
    it "only disables the webhook if it still points at our URL" do
      stub_request(:get, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .to_return(status: 200, body: { url: connection.webhook_url }.to_json)

      disable_stub = stub_request(:patch, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .with(body: hash_including(enabled: false, url: ""))
        .to_return(status: 200, body: "{}")

      result = described_class.new.revoke(connection)
      expect(result[:success]).to be true
      expect(disable_stub).to have_been_requested
    end

    it "leaves a foreign webhook URL alone" do
      stub_request(:get, "https://api.sendgrid.com/v3/user/webhooks/event/settings")
        .to_return(status: 200, body: { url: "https://other-tool.example/wh" }.to_json)

      # No PATCH expected — assert by NOT stubbing it (webmock will raise if hit).
      result = described_class.new.revoke(connection)
      expect(result[:success]).to be true
    end
  end
end
