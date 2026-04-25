# frozen_string_literal: true

require "rails_helper"

RSpec.describe EmailErrorTranslator do
  describe ".translate" do
    let(:from_email) { "hello@send.courierx.dev" }

    it "returns a blank translation for nil error" do
      t = described_class.translate(error: nil, from_email: from_email)
      expect(t.message).to be_nil
      expect(t.cta).to be_nil
    end

    it "returns a blank translation for empty error" do
      t = described_class.translate(error: "", from_email: from_email)
      expect(t.message).to be_nil
    end

    it "interpolates from_domain into pre-flight unverified-domain error" do
      t = described_class.translate(
        error: "no_eligible_provider:no_verified_provider",
        from_email: from_email
      )
      expect(t.message).to include("send.courierx.dev")
      expect(t.cta[:action]).to eq("open_domain")
    end

    it "translates Resend domain-not-verified errors" do
      t = described_class.translate(
        error: 'resend: status 403: "The send.courierx.dev domain is not verified."',
        from_email: from_email
      )
      expect(t.message).to match(/Resend hasn't verified 'send.courierx.dev'/)
      expect(t.cta[:url]).to eq("https://resend.com/domains")
      expect(t.secondary_cta[:action]).to eq("verify_domain_provider")
    end

    it "translates Resend auth errors" do
      t = described_class.translate(
        error: "resend: status 401: invalid api key",
        from_email: from_email
      )
      expect(t.message).to match(/Resend rejected your API key/)
    end

    it "translates SendGrid mail-send-permissions errors" do
      t = described_class.translate(
        error: "sendgrid: status 401: unauthorized",
        from_email: from_email
      )
      expect(t.message).to match(/'Mail Send' permissions/)
    end

    it "translates Postmark server-vs-account-token errors" do
      t = described_class.translate(
        error: '{"ErrorCode": 10, "Message": "Invalid API token"}',
        from_email: from_email
      )
      expect(t.message).to match(/Server Token.*not the Account Token/)
    end

    it "translates SES sandbox identity-not-verified errors" do
      t = described_class.translate(
        error: "MessageRejected: Email address is not verified",
        from_email: from_email
      )
      expect(t.message).to match(/SES sandbox/)
      expect(t.message).to include("send.courierx.dev")
    end

    it "falls back to a default message for unrecognized errors" do
      t = described_class.translate(
        error: "something we've never seen before",
        from_email: from_email
      )
      expect(t.message).to match(/unexpected error/)
      expect(t.cta).to be_nil
    end

    it "handles nil from_email gracefully" do
      t = described_class.translate(
        error: "no_eligible_provider:no_verified_provider",
        from_email: nil
      )
      expect(t.message).not_to include("%{")  # interpolation didn't blow up
    end
  end
end
