# frozen_string_literal: true

require "rails_helper"

RSpec.describe OutboxProcessorJob do
  let(:tenant) { create(:tenant) }
  let(:email) do
    create(:email,
           tenant:     tenant,
           from_email: "noreply@example.com",
           from_name:  "Sender",
           to_email:   "user@example.com",
           subject:    "Test",
           text_body:  "Hi",
           status:     "queued")
  end
  let(:outbox) do
    create(:outbox_event,
           status:  "pending",
           payload: { "email_id" => email.id, "tenant_id" => tenant.id })
  end

  let(:go_success_body) do
    { "messageId" => "go-msg-123", "provider" => "sendgrid", "success" => true }.to_json
  end

  let(:go_send_url) { "#{OutboxProcessorJob::GO_ENGINE_URL}/v1/send" }

  before do
    stub_request(:post, go_send_url)
      .to_return(status: 200, body: go_success_body,
                 headers: { "Content-Type" => "application/json" })
  end

  # ── Success path ──────────────────────────────────────────────────────────

  it "transitions email to sent on a 200 response" do
    described_class.new.perform(outbox.id)
    expect(email.reload.status).to eq("sent")
    expect(email.provider_message_id).to eq("go-msg-123")
  end

  it "marks the outbox event as processed" do
    described_class.new.perform(outbox.id)
    expect(outbox.reload.status).to eq("processed")
  end

  it "sends the X-Internal-Secret header to Go" do
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      headers: { "X-Internal-Secret" => OutboxProcessorJob::GO_SHARED_SECRET }
    )
  end

  it "formats the from address with display name" do
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("from" => "Sender <noreply@example.com>")
    )
  end

  it "formats a plain email address when no display name is set" do
    email.update!(from_name: nil)
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("from" => "noreply@example.com")
    )
  end

  it "includes tenantId in the payload" do
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("tenantId" => tenant.id)
    )
  end

  # ── Failure paths ─────────────────────────────────────────────────────────

  it "leaves email in queued on a 5xx response (transient — retry)" do
    stub_request(:post, /v1\/send/).to_return(status: 503, body: "")
    expect { described_class.new.perform(outbox.id) }.to raise_error(/Go engine 503/)
    expect(email.reload.status).to eq("queued")
  end

  it "marks outbox event as pending (for retry) on 5xx" do
    stub_request(:post, /v1\/send/).to_return(status: 503, body: "")
    expect { described_class.new.perform(outbox.id) }.to raise_error(/Go engine 503/)
    expect(outbox.reload.status).to eq("pending")
  end

  it "marks email as failed and event as dead on a 4xx response (permanent rejection)" do
    stub_request(:post, /v1\/send/).to_return(status: 400, body: '{"error":"invalid recipient"}')
    described_class.new.perform(outbox.id)
    expect(email.reload.status).to eq("failed")
    expect(outbox.reload.status).to eq("dead")
  end

  it "re-raises Faraday connection errors so Sidekiq retries" do
    stub_request(:post, /v1\/send/).to_raise(Faraday::ConnectionFailed.new("ECONNREFUSED"))
    expect { described_class.new.perform(outbox.id) }.to raise_error(Faraday::ConnectionFailed)
    # Email stays queued — transient infra failure must not surface as a delivery failure.
    expect(email.reload.status).to eq("queued")
    expect(outbox.reload.status).to eq("pending")
  end

  # ── Idempotency ───────────────────────────────────────────────────────────

  it "is a no-op when the outbox event is already processed" do
    outbox.update!(status: "processed")
    described_class.new.perform(outbox.id)
    expect(WebMock).not_to have_requested(:post, /v1\/send/)
  end

  it "is a no-op when the outbox event is already processing" do
    outbox.update!(status: "processing")
    described_class.new.perform(outbox.id)
    expect(WebMock).not_to have_requested(:post, /v1\/send/)
  end

  # ── BYOK provider routes ──────────────────────────────────────────────────

  context "when tenant has active provider connections via a routing rule" do
    let(:tenant) { create(:tenant, mode: "byok") }
    let(:provider_conn) do
      create(:provider_connection, tenant: tenant, provider: "sendgrid")
    end
    let(:routing_rule) do
      create(:routing_rule, tenant: tenant, is_active: true, is_default: true, name: "default")
    end
    # The resolver requires a verified domain + a verified DPV row for this
    # connection. Without these the email rejects pre-flight and never reaches Go.
    let!(:byok_domain) do
      create(:domain, tenant: tenant, domain: "example.com", status: "verified")
    end
    let!(:dpv) do
      create(:domain_provider_verification,
             domain:              byok_domain,
             provider_connection: provider_conn,
             status:              "verified")
    end

    before do
      create(:routing_rule_provider,
             routing_rule:        routing_rule,
             provider_connection: provider_conn,
             priority:            1)
    end

    it "includes providers array in the Go payload" do
      described_class.new.perform(outbox.id)
      expect(WebMock).to have_requested(:post, /v1\/send/).with(
        body: hash_including("providers" => array_including(
          hash_including("provider" => hash_including("type" => "sendgrid"))
        ))
      )
    end

    it "includes provider credentials in config" do
      described_class.new.perform(outbox.id)
      expect(WebMock).to have_requested(:post, /v1\/send/).with(
        body: hash_including("providers" => array_including(
          hash_including("provider" => hash_including("config" => hash_including("apiKey")))
        ))
      )
    end
  end

  context "when tenant has no routing rules" do
    it "omits the providers key from the payload" do
      described_class.new.perform(outbox.id)
      expect(WebMock).to have_requested(:post, /v1\/send/).with(
        body: satisfy { |body| !JSON.parse(body).key?("providers") }
      )
    end
  end

  # ── Optional fields ───────────────────────────────────────────────────────

  it "includes idempotencyKey when present in outbox payload" do
    outbox.update!(payload: outbox.payload.merge("idempotency_key" => "my-idem-key"))
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("idempotencyKey" => "my-idem-key")
    )
  end

  it "includes replyTo when email has a reply_to set" do
    email.update!(reply_to: "replies@example.com")
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("replyTo" => "replies@example.com")
    )
  end

  # ── Metadata coercion ─────────────────────────────────────────────────────
  # Go's SendRequest.Metadata is map[string]string. Non-string values used to
  # 400 the entire request and silently fail the email. Rails must coerce.

  it "stringifies bool/numeric metadata values before sending to Go" do
    email.update!(metadata: { "order_id" => 12_345, "is_test" => true, "tier" => "pro" })
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("metadata" => {
        "order_id" => "12345",
        "is_test"  => "true",
        "tier"     => "pro"
      })
    )
  end

  it "drops track_opens/track_clicks from metadata (already promoted to top-level)" do
    email.update!(metadata: { "track_opens" => "true", "track_clicks" => "true", "purpose" => "tx" })
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("metadata" => { "purpose" => "tx" }, "trackOpens" => true, "trackClicks" => true)
    )
  end

  it "JSON-encodes nested metadata values" do
    email.update!(metadata: { "ctx" => { "page" => "checkout", "step" => 2 } })
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("metadata" => { "ctx" => '{"page":"checkout","step":2}' })
    )
  end
end
