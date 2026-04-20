# frozen_string_literal: true

require "rails_helper"

RSpec.describe Email, type: :model do
  # ── Associations ──────────────────────────────────────────────────────────

  it { should belong_to(:tenant) }
  it { should belong_to(:provider_connection).optional }
  it { should belong_to(:domain).optional }
  it { should belong_to(:outbox_event).optional }
  it { should have_many(:email_events).dependent(:destroy) }

  # ── Validations ───────────────────────────────────────────────────────────

  it { should validate_presence_of(:from_email) }
  it { should validate_presence_of(:to_email) }
  it { should validate_presence_of(:subject) }
  it { should validate_presence_of(:status) }
  it { should validate_inclusion_of(:status).in_array(Email::STATUSES) }

  # ── Normalisation ─────────────────────────────────────────────────────────

  describe "to_email normalisation" do
    it "downcases before validation" do
      email = build(:email, to_email: "User@EXAMPLE.COM")
      email.valid?
      expect(email.to_email).to eq("user@example.com")
    end

    it "strips surrounding whitespace before validation" do
      email = build(:email, to_email: "  user@example.com  ")
      email.valid?
      expect(email.to_email).to eq("user@example.com")
    end

    it "handles nil gracefully" do
      email = build(:email, to_email: nil)
      email.valid?
      expect(email.to_email).to be_nil
    end
  end

  # ── Scopes ────────────────────────────────────────────────────────────────

  describe ".by_status" do
    it "returns only emails with the given status" do
      queued    = create(:email, status: "queued")
      _delivered = create(:email, :delivered)
      expect(Email.by_status("queued")).to contain_exactly(queued)
    end
  end

  describe ".recent" do
    it "orders emails newest first" do
      older = create(:email, created_at: 1.hour.ago)
      newer = create(:email, created_at: 1.minute.ago)
      expect(Email.recent.first).to eq(newer)
      expect(Email.recent.last).to eq(older)
    end
  end

  describe ".sent_today" do
    it "includes emails created today" do
      today = create(:email)
      expect(Email.sent_today).to include(today)
    end

    it "excludes emails created before today" do
      yesterday = create(:email, created_at: 25.hours.ago)
      expect(Email.sent_today).not_to include(yesterday)
    end
  end

  # ── Status transition methods ─────────────────────────────────────────────

  describe "#mark_sent!" do
    it "transitions status to sent and records provider info" do
      provider_conn = create(:provider_connection)
      email = create(:email, tenant: provider_conn.tenant, status: "queued")

      email.mark_sent!(provider_message_id: "sg-abc123", provider_connection: provider_conn)

      expect(email.reload.status).to eq("sent")
      expect(email.provider_message_id).to eq("sg-abc123")
      expect(email.provider_connection).to eq(provider_conn)
      expect(email.sent_at).to be_within(2.seconds).of(Time.current)
    end
  end

  describe "#mark_delivered!" do
    it "transitions status to delivered and sets delivered_at" do
      email = create(:email, :sent)
      email.mark_delivered!
      expect(email.reload.status).to eq("delivered")
      expect(email.delivered_at).to be_within(2.seconds).of(Time.current)
    end
  end

  describe "#mark_bounced!" do
    it "transitions status to bounced" do
      email = create(:email, :sent)
      email.mark_bounced!(error: "550 User unknown")
      expect(email.reload.status).to eq("bounced")
      expect(email.last_error).to eq("550 User unknown")
    end

    it "marks bounced without an error message" do
      email = create(:email, :sent)
      email.mark_bounced!
      expect(email.reload.status).to eq("bounced")
    end
  end

  describe "#mark_failed!" do
    it "transitions status to failed and increments attempt_count" do
      email = create(:email, status: "queued", attempt_count: 0)
      email.mark_failed!(error: "Connection timeout")
      email.reload
      expect(email.status).to eq("failed")
      expect(email.last_error).to eq("Connection timeout")
      expect(email.attempt_count).to eq(1)
    end
  end
end
