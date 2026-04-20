# frozen_string_literal: true

require "rails_helper"

RSpec.describe Suppression, type: :model do
  # ── Associations ──────────────────────────────────────────────────────────

  it { should belong_to(:tenant) }

  # ── Validations ───────────────────────────────────────────────────────────

  it { should validate_presence_of(:email) }
  it { should validate_presence_of(:reason) }
  it { should validate_inclusion_of(:reason).in_array(Suppression::REASONS) }

  describe "email uniqueness per tenant" do
    it "allows the same email for different tenants" do
      tenant_a = create(:tenant)
      tenant_b = create(:tenant)
      create(:suppression, tenant: tenant_a, email: "user@example.com")
      expect { create(:suppression, tenant: tenant_b, email: "user@example.com") }.not_to raise_error
    end

    it "rejects duplicate email within the same tenant" do
      tenant = create(:tenant)
      create(:suppression, tenant: tenant, email: "user@example.com")
      expect {
        create(:suppression, tenant: tenant, email: "user@example.com")
      }.to raise_error(ActiveRecord::RecordInvalid, /has already been taken/)
    end
  end

  # ── Scopes ────────────────────────────────────────────────────────────────

  describe ".bounces" do
    it "returns hard_bounce and soft_bounce records" do
      hard  = create(:suppression, reason: "hard_bounce")
      soft  = create(:suppression, reason: "soft_bounce", email: "soft@example.com", tenant: hard.tenant)
      _manual = create(:suppression, :manual, email: "manual@example.com", tenant: hard.tenant)
      expect(Suppression.bounces).to contain_exactly(hard, soft)
    end
  end

  describe ".complaints" do
    it "returns only complaint records" do
      complaint = create(:suppression, :complaint)
      _bounce   = create(:suppression, email: "bounce@example.com", tenant: complaint.tenant)
      expect(Suppression.complaints).to contain_exactly(complaint)
    end
  end

  # ── .suppressed? ──────────────────────────────────────────────────────────

  describe ".suppressed?" do
    let(:tenant) { create(:tenant) }

    before { create(:suppression, tenant: tenant, email: "blocked@example.com") }

    it "returns true for a suppressed address" do
      expect(Suppression.suppressed?(tenant.id, "blocked@example.com")).to be true
    end

    it "returns false for a non-suppressed address" do
      expect(Suppression.suppressed?(tenant.id, "allowed@example.com")).to be false
    end

    it "is case-insensitive" do
      expect(Suppression.suppressed?(tenant.id, "BLOCKED@EXAMPLE.COM")).to be true
    end

    it "strips whitespace before checking" do
      expect(Suppression.suppressed?(tenant.id, "  blocked@example.com  ")).to be true
    end

    it "returns false for a different tenant even if the email matches" do
      other_tenant = create(:tenant)
      expect(Suppression.suppressed?(other_tenant.id, "blocked@example.com")).to be false
    end
  end
end
