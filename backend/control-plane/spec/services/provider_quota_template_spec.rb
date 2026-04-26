# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderQuotaTemplate do
  describe ".for" do
    it "returns Resend free-tier defaults" do
      t = described_class.for("resend")
      expect(t[:daily_cap]).to eq(100)
      expect(t[:monthly_cap]).to eq(3_000)
    end

    it "returns sandbox-aware SES defaults" do
      t = described_class.for("aws_ses")
      expect(t[:daily_cap]).to eq(200)
      expect(t[:reset_strategy]).to eq("rolling_24h")
    end

    it "falls back to no-cap defaults for unknown providers" do
      t = described_class.for("unknown_provider")
      expect(t[:daily_cap]).to be_nil
      expect(t[:monthly_cap]).to be_nil
    end
  end

  describe ".seed!" do
    let(:tenant)     { create(:tenant, :byok) }
    let(:connection) { create(:provider_connection, tenant: tenant, provider: "resend") }

    it "creates a ProviderQuota row from the template" do
      expect { described_class.seed!(connection) }
        .to change(ProviderQuota, :count).by(1)

      quota = connection.reload.provider_quota
      expect(quota.daily_cap).to eq(100)
      expect(quota.monthly_cap).to eq(3_000)
      expect(quota.cap_source).to eq("provider_template")
    end

    it "is idempotent — a second call doesn't create another row" do
      described_class.seed!(connection)
      expect { described_class.seed!(connection) }.not_to change(ProviderQuota, :count)
    end

    it "returns the existing quota when already seeded" do
      first  = described_class.seed!(connection)
      second = described_class.seed!(connection.reload)
      expect(second.id).to eq(first.id)
    end
  end
end
