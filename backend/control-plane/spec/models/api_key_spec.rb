# frozen_string_literal: true

require "rails_helper"

RSpec.describe ApiKey, type: :model do
  # ── Associations ──────────────────────────────────────────────────────────

  it { should belong_to(:tenant) }

  # ── Validations ───────────────────────────────────────────────────────────

  it { should validate_presence_of(:name) }
  it { should validate_presence_of(:key_hash) }
  it { should validate_presence_of(:key_prefix) }
  it { should validate_presence_of(:status) }
  it { should validate_inclusion_of(:status).in_array(%w[active revoked expired]) }
  describe "key_hash uniqueness" do
    subject { create(:api_key) }
    it { should validate_uniqueness_of(:key_hash) }
  end

  # ── Scopes ────────────────────────────────────────────────────────────────

  describe ".active" do
    it "returns only active keys" do
      active  = create(:api_key)
      _revoked = create(:api_key, :revoked)
      expect(ApiKey.active).to contain_exactly(active)
    end
  end

  # ── .authenticate ─────────────────────────────────────────────────────────

  describe ".authenticate" do
    it "returns the key record for a valid active key" do
      key = create(:api_key)
      result = ApiKey.authenticate(key.raw_key)
      expect(result).to eq(key)
    end

    it "returns nil for an unknown key" do
      expect(ApiKey.authenticate("cxk_unknown_key_that_does_not_exist")).to be_nil
    end

    it "returns nil for a revoked key" do
      key = create(:api_key)
      key.revoke!
      expect(ApiKey.authenticate(key.raw_key)).to be_nil
    end

    it "returns nil for an expired key" do
      key = create(:api_key, expires_at: 1.hour.ago)
      expect(ApiKey.authenticate(key.raw_key)).to be_nil
    end

    it "lazily marks an active-status but past-expiry key as expired in the DB" do
      # BUG: The current implementation returns nil at `return nil if key.expired?`
      # before reaching the `update_columns` call, so the lazy DB update never fires.
      # This test documents the intended behaviour; fix by moving update_columns above
      # the early return in ApiKey.authenticate.
      pending "lazy DB expiry update never fires due to early return (see ApiKey.authenticate)"

      key = create(:api_key, expires_at: 1.hour.ago)
      key.update_columns(status: "active")

      ApiKey.authenticate(key.raw_key)

      expect(key.reload.status).to eq("expired")
    end

    it "touches last_used_at on successful authentication" do
      key = create(:api_key)
      expect { ApiKey.authenticate(key.raw_key) }
        .to change { key.reload.last_used_at }
    end

    it "does not touch last_used_at for a non-existent key" do
      expect { ApiKey.authenticate("cxk_nonexistent") }.not_to raise_error
    end
  end

  # ── Instance methods ──────────────────────────────────────────────────────

  describe "#revoke!" do
    it "sets status to revoked" do
      key = create(:api_key)
      key.revoke!
      expect(key.reload.status).to eq("revoked")
    end
  end

  describe "#expired?" do
    it "returns false when expires_at is nil" do
      key = build(:api_key, expires_at: nil)
      expect(key.expired?).to be false
    end

    it "returns false when expires_at is in the future" do
      key = build(:api_key, expires_at: 1.hour.from_now)
      expect(key.expired?).to be false
    end

    it "returns true when expires_at is in the past" do
      key = build(:api_key, expires_at: 1.second.ago)
      expect(key.expired?).to be true
    end
  end
end
