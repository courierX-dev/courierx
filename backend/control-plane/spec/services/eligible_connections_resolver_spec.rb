# frozen_string_literal: true

require "rails_helper"

RSpec.describe EligibleConnectionsResolver do
  let(:tenant)  { create(:tenant, :byok) }
  let(:domain)  { create(:domain, tenant: tenant, domain: "send.example.com", status: "verified") }
  let(:resend)  { create(:provider_connection, tenant: tenant, provider: "resend", display_name: "Resend Primary") }
  let(:ses)     { create(:provider_connection, tenant: tenant, provider: "aws_ses", display_name: "SES Backup") }

  def verify(domain, conn)
    create(:domain_provider_verification, domain: domain, provider_connection: conn, status: "verified")
  end

  describe "happy paths" do
    it "returns the verified connection when no routing rule exists" do
      verify(domain, resend)
      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result.eligible.map(&:id)).to eq([resend.id])
    end

    it "filters out connections without a verified DPV for the from-domain" do
      verify(domain, resend)
      ses # exists but no DPV
      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result.eligible.map(&:id)).to eq([resend.id])
    end

    it "returns connections in the routing rule's priority order" do
      verify(domain, resend)
      verify(domain, ses)
      rule = create(:routing_rule, :default, tenant: tenant)
      create(:routing_rule_provider, routing_rule: rule, provider_connection: ses,    priority: 1)
      create(:routing_rule_provider, routing_rule: rule, provider_connection: resend, priority: 2)

      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result.eligible.map(&:id)).to eq([ses.id, resend.id])
    end
  end

  describe "edge cases" do
    it "rejects with :unverified_domain when the from-domain isn't owned" do
      verify(domain, resend)
      result = described_class.call(tenant: tenant, from_email: "hi@some-other-domain.com")
      expect(result).to be_empty
      expect(result.reason).to eq(:unverified_domain)
    end

    it "rejects with :no_verified_provider when no DPV is verified" do
      domain # owns the domain (no DPV though)
      resend # exists but no DPV
      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result).to be_empty
      expect(result.reason).to eq(:no_verified_provider)
    end

    # ── Regression: empty routing rule fall-through ─────────────────────────
    # 2026-04-26 — A tenant had a default routing rule auto-created on signup
    # but never populated. The resolver returned :no_verified_provider even
    # though they had a verified Resend connection, because the empty rule
    # was treated as an explicit empty chain. Now empty rules fall through to
    # "all active connections by priority".
    it "falls through to all active connections when the matched rule has no providers" do
      verify(domain, resend)
      create(:routing_rule, :default, tenant: tenant)  # default rule with no providers attached
      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result.eligible.map(&:id)).to eq([resend.id])
      expect(result.reason).to be_nil
    end

    it "skips inactive connections even with verified DPV" do
      resend.update!(status: "inactive")
      verify(domain, resend)
      result = described_class.call(tenant: tenant, from_email: "hi@send.example.com")
      expect(result).to be_empty
      expect(result.reason).to eq(:no_verified_provider)
    end
  end
end
