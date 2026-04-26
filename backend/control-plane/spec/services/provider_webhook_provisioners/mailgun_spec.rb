# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderWebhookProvisioners::Mailgun do
  let(:tenant)     { create(:tenant) }
  let(:connection) do
    create(:provider_connection, :mailgun, tenant: tenant, api_key: "mg-key-abc")
  end

  before { stub_const("ENV", ENV.to_h.merge("PUBLIC_API_URL" => "https://api.example.test")) }

  describe "#provision" do
    it "registers all event webhooks and stores the HTTP signing key" do
      described_class::EVENT_IDS.each do |event_id|
        stub_request(:put, "https://api.mailgun.net/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
          .to_return(status: 200, body: "{}")
      end
      stub_request(:get, "https://api.mailgun.net/v5/accounts/http-signing-key")
        .to_return(status: 200, body: { "http_signing_key" => "mg-signing-key" }.to_json)

      result = described_class.new.provision(connection)

      expect(result[:success]).to be true
      expect(result[:status]).to eq "auto"
      expect(result[:external_id]).to eq connection.smtp_host
      expect(result[:signing_secret]).to eq "mg-signing-key"
    end

    it "marks needs_signing_key when the signing-key API forbids the read" do
      described_class::EVENT_IDS.each do |event_id|
        stub_request(:put, "https://api.mailgun.net/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
          .to_return(status: 200, body: "{}")
      end
      stub_request(:get, "https://api.mailgun.net/v5/accounts/http-signing-key")
        .to_return(status: 403, body: "{}")

      result = described_class.new.provision(connection)
      expect(result[:status]).to eq "needs_signing_key"
      expect(result[:signing_secret]).to be_nil
    end

    it "uses the EU API host for EU-region connections" do
      connection.update_columns(region: "eu")
      described_class::EVENT_IDS.each do |event_id|
        stub_request(:put, "https://api.eu.mailgun.net/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
          .to_return(status: 200, body: "{}")
      end
      stub_request(:get, "https://api.eu.mailgun.net/v5/accounts/http-signing-key")
        .to_return(status: 200, body: { "http_signing_key" => "eu-key" }.to_json)

      result = described_class.new.provision(connection)
      expect(result[:success]).to be true
    end

    it "fails when the smtp_host is missing" do
      connection.update_columns(smtp_host: nil)
      result = described_class.new.provision(connection)
      expect(result[:success]).to be false
      expect(result[:error]).to match(/domain/i)
    end
  end

  describe "#revoke" do
    it "deletes each event webhook" do
      described_class::EVENT_IDS.each do |event_id|
        stub_request(:delete, "https://api.mailgun.net/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
          .to_return(status: 200, body: "{}")
      end

      expect(described_class.new.revoke(connection)).to eq(success: true)
    end

    it "treats 404s as success" do
      described_class::EVENT_IDS.each do |event_id|
        stub_request(:delete, "https://api.mailgun.net/v3/domains/#{connection.smtp_host}/webhooks/#{event_id}")
          .to_return(status: 404, body: "{}")
      end

      expect(described_class.new.revoke(connection)).to eq(success: true)
    end
  end
end
