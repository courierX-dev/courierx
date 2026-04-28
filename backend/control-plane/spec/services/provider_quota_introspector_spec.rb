# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderQuotaIntrospector do
  let(:tenant) { create(:tenant, :byok) }

  describe ".call" do
    context "sendgrid" do
      let(:connection) { create(:provider_connection, tenant: tenant, provider: "sendgrid", api_key: "SG.test") }

      it "extracts monthly_cap from /v3/user/credits" do
        stub_request(:get, "https://api.sendgrid.com/v3/user/credits")
          .to_return(status: 200, body: { total: 40_000, next_reset: "2026-05-01" }.to_json)

        result = described_class.call(connection)
        expect(result.ok?).to be(true)
        expect(result.monthly_cap).to eq(40_000)
        expect(result.daily_cap).to be_nil
      end

      it "skips when the credits endpoint 404s (plan doesn't expose it)" do
        stub_request(:get, "https://api.sendgrid.com/v3/user/credits")
          .to_return(status: 404, body: "{}")

        result = described_class.call(connection)
        expect(result.ok?).to be(false)
        expect(result.detail).to include("not available")
      end

      it "skips on auth failure" do
        stub_request(:get, "https://api.sendgrid.com/v3/user/credits")
          .to_return(status: 401, body: "{}")

        result = described_class.call(connection)
        expect(result.ok?).to be(false)
        expect(result.detail).to include("auth failed")
      end
    end

    context "brevo" do
      let(:connection) { create(:provider_connection, tenant: tenant, provider: "sendgrid", api_key: "xkeysib-test") }

      before { connection.update_column(:provider, "brevo") }

      it "extracts monthly_cap from /v3/account credits" do
        stub_request(:get, "https://api.brevo.com/v3/account")
          .to_return(status: 200, body: { plan: [ { type: "sendLimit", credits: 9_000 } ] }.to_json)

        result = described_class.call(connection.reload)
        expect(result.ok?).to be(true)
        expect(result.monthly_cap).to eq(9_000)
      end
    end

    context "postmark" do
      let(:connection) { create(:provider_connection, :postmark, tenant: tenant) }

      it "always skips — server token has no plan-level quota endpoint" do
        result = described_class.call(connection)
        expect(result.ok?).to be(false)
        expect(result.detail).to include("manual cap")
      end
    end

    context "aws_ses" do
      let(:connection) { create(:provider_connection, :ses, tenant: tenant, api_key: "AKIATEST") }

      it "parses Max24HourSend out of the GetSendQuota XML response" do
        stub_request(:post, %r{https://email\..*\.amazonaws\.com/})
          .to_return(status: 200, body: <<~XML)
            <GetSendQuotaResponse>
              <GetSendQuotaResult>
                <Max24HourSend>50000.0</Max24HourSend>
                <SentLast24Hours>123.0</SentLast24Hours>
              </GetSendQuotaResult>
            </GetSendQuotaResponse>
          XML

        result = described_class.call(connection)
        expect(result.ok?).to be(true)
        expect(result.daily_cap).to eq(50_000)
      end

      it "skips when credentials are missing" do
        connection.update_columns(encrypted_api_key: nil, encrypted_secret: nil)
        # Re-fetch as a fresh instance — ProviderConnection memoizes the
        # decrypted values in @api_key / @secret, and AR#reload doesn't
        # clear those instance variables.
        fresh = ProviderConnection.find(connection.id)
        result = described_class.call(fresh)
        expect(result.ok?).to be(false)
        expect(result.detail).to include("missing credentials")
      end
    end

    context "unknown provider" do
      let(:connection) { create(:provider_connection, :smtp, tenant: tenant) }

      it "returns a skipped result rather than raising" do
        result = described_class.call(connection)
        expect(result.ok?).to be(false)
        expect(result.detail).to include("not implemented")
      end
    end
  end
end
