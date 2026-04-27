# frozen_string_literal: true

require "rails_helper"

RSpec.describe SpfAdvisor do
  describe ".call" do
    it "returns ok level for a single Resend provider" do
      r = described_class.call(["resend"])
      expect(r.level).to eq("ok")
      expect(r.spf_record).to eq("v=spf1 include:amazonses.com ~all")
      expect(r.includes).to eq(["amazonses.com"])
    end

    it "dedupes Resend + SES which share the amazonses.com include" do
      r = described_class.call(["resend", "aws_ses"])
      expect(r.includes).to eq(["amazonses.com"])
      expect(r.lookup_count).to be < described_class::WARN_AT
    end

    it "skips providers that don't need SPF (Postmark)" do
      r = described_class.call(["postmark"])
      expect(r.spf_record).to be_nil
      expect(r.lookup_count).to eq(0)
      expect(r.level).to eq("ok")
    end

    it "warns when nearing the 10-lookup cap" do
      # 3 providers with combined estimated lookups in the 8-9 range
      r = described_class.call(["sendgrid", "mailgun", "resend"])
      # sendgrid(3) + mailgun(2) + amazonses(2) = 7 — just under warn
      expect(r.lookup_count).to eq(7)
      expect(r.level).to eq("ok")
    end

    it "flags danger when over the cap" do
      # Force lookup count over 10 by stubbing the table
      stub_const("#{described_class.name}::ESTIMATED_NESTED_LOOKUPS", {
        "amazonses.com" => 11
      })
      r = described_class.call(["resend"])
      expect(r.level).to eq("danger")
      expect(r.message).to match(/over the 10-lookup limit/)
    end

    it "accepts ProviderConnection-like objects" do
      conn = double("ProviderConnection", provider: "sendgrid")
      r = described_class.call([conn])
      expect(r.includes).to eq(["sendgrid.net"])
    end

    it "ignores duplicate connections of the same provider type" do
      # Two Resend accounts share the same SPF include
      r = described_class.call(["resend", "resend"])
      expect(r.includes).to eq(["amazonses.com"])
    end

    it "returns nil spf_record when no providers contribute SPF" do
      r = described_class.call(["postmark", "smtp"])
      expect(r.spf_record).to be_nil
      expect(r.includes).to be_empty
    end
  end
end
