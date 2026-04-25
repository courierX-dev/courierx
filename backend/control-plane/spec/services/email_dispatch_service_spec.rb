# frozen_string_literal: true

require "rails_helper"

RSpec.describe EmailDispatchService do
  let(:tenant) { create(:tenant) }
  let!(:domain) { create(:domain, tenant: tenant, domain: "example.com", status: "verified") }
  let(:params) do
    {
      from_email: "noreply@example.com",
      to_email:   "user@other.com",
      subject:    "Hello",
      text_body:  "Hi there"
    }
  end

  before do
    # Prevent OutboxProcessorJob from actually running
    allow(OutboxProcessorJob).to receive(:perform_async)
  end

  # ── Happy path ────────────────────────────────────────────────────────────

  describe "#call — success" do
    it "returns success: true with an Email record" do
      result = described_class.call(tenant: tenant, params: params)
      expect(result[:success]).to be true
      expect(result[:email]).to be_a(Email)
      expect(result[:email]).to be_persisted
    end

    it "creates an Email record with status 'queued'" do
      described_class.call(tenant: tenant, params: params)
      expect(Email.last.status).to eq("queued")
    end

    it "creates an OutboxEvent linked to the Email in a single transaction" do
      expect {
        described_class.call(tenant: tenant, params: params)
      }.to change(Email, :count).by(1).and change(OutboxEvent, :count).by(1)

      email  = Email.last
      outbox = OutboxEvent.last
      expect(email.outbox_event_id).to eq(outbox.id)
      expect(outbox.payload["email_id"]).to eq(email.id)
    end

    it "enqueues OutboxProcessorJob with the outbox event id" do
      described_class.call(tenant: tenant, params: params)
      outbox_id = OutboxEvent.last.id
      expect(OutboxProcessorJob).to have_received(:perform_async).with(outbox_id)
    end

    it "scopes the email to the calling tenant" do
      described_class.call(tenant: tenant, params: params)
      expect(Email.last.tenant_id).to eq(tenant.id)
    end
  end

  # ── Atomic rollback ───────────────────────────────────────────────────────

  describe "#call — transaction failure" do
    it "rolls back the Email if OutboxEvent creation raises" do
      allow(OutboxEvent).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(OutboxEvent.new))
      expect {
        described_class.call(tenant: tenant, params: params)
      }.not_to change(Email, :count)
    end

    it "returns success: false on unexpected error" do
      allow(OutboxEvent).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(OutboxEvent.new))
      result = described_class.call(tenant: tenant, params: params)
      expect(result[:success]).to be false
      expect(result[:error]).to be_present
    end
  end

  # ── Domain verification ───────────────────────────────────────────────────

  describe "#call — unverified from domain" do
    let(:tenant) { create(:tenant, :byok) }

    it "returns success: false when the from_email domain is not verified on the account" do
      domain.update!(status: "pending")
      result = described_class.call(tenant: tenant, params: params)
      expect(result[:success]).to be false
      expect(result[:error]).to match(/isn't verified on this account/)
    end

    it "does not create any Email record for an unverified domain" do
      domain.update!(status: "pending")
      expect { described_class.call(tenant: tenant, params: params) }.not_to change(Email, :count)
    end

    it "rejects when the domain is verified but no provider connection has it verified" do
      # Domain is verified on our side, but no DomainProviderVerification rows
      # exist — the resolver has nowhere to send from.
      result = described_class.call(tenant: tenant, params: params)
      expect(result[:success]).to be false
      expect(result[:error]).to match(/No connected provider has/)
    end
  end

  # ── Suppression ───────────────────────────────────────────────────────────

  describe "#call — suppressed recipient" do
    before { create(:suppression, tenant: tenant, email: "user@other.com") }

    it "returns success: false with a suppression error" do
      result = described_class.call(tenant: tenant, params: params)
      expect(result[:success]).to be false
      expect(result[:error]).to match(/suppressed/i)
    end

    it "creates a suppressed Email record (for audit)" do
      expect {
        described_class.call(tenant: tenant, params: params)
      }.to change(Email, :count).by(1)
      expect(Email.last.status).to eq("suppressed")
    end

    it "does not create an OutboxEvent for suppressed sends" do
      expect {
        described_class.call(tenant: tenant, params: params)
      }.not_to change(OutboxEvent, :count)
    end

    it "does not enqueue OutboxProcessorJob" do
      described_class.call(tenant: tenant, params: params)
      expect(OutboxProcessorJob).not_to have_received(:perform_async)
    end
  end

  # ── Idempotency ───────────────────────────────────────────────────────────

  describe "#call — idempotency" do
    let(:idempotent_params) do
      params.merge(metadata: { idempotency_key: "idem-abc-123" })
    end

    it "returns the existing Email on duplicate idempotency key" do
      first  = described_class.call(tenant: tenant, params: idempotent_params)
      second = described_class.call(tenant: tenant, params: idempotent_params)

      expect(first[:email].id).to eq(second[:email].id)
    end

    it "creates only one Email record for duplicate idempotency key" do
      expect {
        2.times { described_class.call(tenant: tenant, params: idempotent_params) }
      }.to change(Email, :count).by(1)
    end

    it "marks the duplicate response as idempotent" do
      described_class.call(tenant: tenant, params: idempotent_params)
      second = described_class.call(tenant: tenant, params: idempotent_params)
      expect(second[:idempotent]).to be true
    end

    it "does not enforce idempotency across tenants" do
      other = create(:tenant)
      create(:domain, tenant: other, domain: "example.com", status: "verified")
      first  = described_class.call(tenant: tenant, params: idempotent_params)
      second = described_class.call(tenant: other,  params: idempotent_params)
      expect(first[:email].id).not_to eq(second[:email].id)
    end

    it "creates a new send after the 24-hour idempotency window expires" do
      described_class.call(tenant: tenant, params: idempotent_params)
      Email.last.update_columns(created_at: 25.hours.ago)
      expect {
        described_class.call(tenant: tenant, params: idempotent_params)
      }.to change(Email, :count).by(1)
    end
  end
end
