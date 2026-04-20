# frozen_string_literal: true

require "rails_helper"

RSpec.describe WebhookDeliveryJob do
  let(:tenant)   { create(:tenant) }
  let(:endpoint) { create(:webhook_endpoint, tenant: tenant, url: "https://hooks.example.com/events") }
  let(:payload)  { { "event" => "delivered", "email_id" => SecureRandom.uuid } }

  before do
    # Resolve the public hostname to a non-blocked IP
    allow(Resolv).to receive(:getaddresses).with("hooks.example.com").and_return(["93.184.216.34"])
  end

  # ── Happy path ────────────────────────────────────────────────────────────

  it "POSTs the payload to the endpoint URL" do
    stub = stub_request(:post, endpoint.url).to_return(status: 200, body: "ok")
    described_class.new.perform(endpoint.id, payload)
    expect(stub).to have_been_requested
  end

  it "includes HMAC-SHA256 signature header" do
    stub_request(:post, endpoint.url).to_return(status: 200, body: "ok")
    described_class.new.perform(endpoint.id, payload)
    expect(a_request(:post, endpoint.url).with { |req|
      req.headers["X-Courierx-Signature"].to_s.start_with?("sha256=")
    }).to have_been_made
  end

  it "includes timestamp header" do
    stub_request(:post, endpoint.url).to_return(status: 200, body: "ok")
    described_class.new.perform(endpoint.id, payload)
    expect(a_request(:post, endpoint.url).with { |req|
      req.headers["X-Courierx-Timestamp"].to_s =~ /\A\d+\z/
    }).to have_been_made
  end

  it "creates a WebhookDelivery record" do
    stub_request(:post, endpoint.url).to_return(status: 200, body: "ok")
    expect {
      described_class.new.perform(endpoint.id, payload)
    }.to change(WebhookDelivery, :count).by(1)
  end

  it "marks the WebhookDelivery as successful on 200" do
    stub_request(:post, endpoint.url).to_return(status: 200, body: "ok")
    described_class.new.perform(endpoint.id, payload)
    expect(WebhookDelivery.last.success).to be true
  end

  # ── SSRF protection ───────────────────────────────────────────────────────

  shared_examples "blocks SSRF to IP" do |ip_address, description|
    it "blocks delivery to #{description}" do
      allow(Resolv).to receive(:getaddresses).with(anything).and_return([ip_address])
      expect {
        described_class.new.perform(endpoint.id, payload)
      }.to raise_error(ArgumentError, /private or reserved IP/)
    end
  end

  include_examples "blocks SSRF to IP", "10.0.0.1",       "RFC 1918 10.x"
  include_examples "blocks SSRF to IP", "172.16.0.1",     "RFC 1918 172.16.x"
  include_examples "blocks SSRF to IP", "192.168.1.1",    "RFC 1918 192.168.x"
  include_examples "blocks SSRF to IP", "127.0.0.1",      "loopback"
  include_examples "blocks SSRF to IP", "169.254.169.254", "AWS IMDS"

  it "blocks delivery when the URL scheme is not http or https" do
    endpoint.update!(url: "ftp://hooks.example.com/webhook")
    allow(Resolv).to receive(:getaddresses).with("hooks.example.com").and_return(["93.184.216.34"])
    expect {
      described_class.new.perform(endpoint.id, payload)
    }.to raise_error(ArgumentError, /http or https/)
  end

  # ── Inactive endpoint ─────────────────────────────────────────────────────

  it "is a no-op when the endpoint is inactive" do
    endpoint.update!(is_active: false)
    described_class.new.perform(endpoint.id, payload)
    expect(WebMock).not_to have_requested(:post, anything)
  end

  # ── Failed delivery ───────────────────────────────────────────────────────

  it "re-raises on non-2xx so Sidekiq can retry" do
    stub_request(:post, endpoint.url).to_return(status: 503, body: "Service Unavailable")
    expect {
      described_class.new.perform(endpoint.id, payload)
    }.to raise_error(RuntimeError, /503/)
  end

  it "creates a WebhookDelivery record even on failed delivery" do
    stub_request(:post, endpoint.url).to_return(status: 503, body: "error")
    expect {
      described_class.new.perform(endpoint.id, payload) rescue nil
    }.to change(WebhookDelivery, :count).by(1)
  end

  it "re-raises on Faraday connection error so Sidekiq can retry" do
    stub_request(:post, endpoint.url).to_raise(Faraday::ConnectionFailed.new("ECONNREFUSED"))
    expect {
      described_class.new.perform(endpoint.id, payload)
    }.to raise_error(Faraday::ConnectionFailed)
  end
end
