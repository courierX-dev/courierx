# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProviderWebhookProvisionJob do
  let(:tenant)     { create(:tenant) }
  let(:connection) { create(:provider_connection, :resend, tenant: tenant, api_key: "re_x") }
  let(:provisioner) { instance_double(ProviderWebhookProvisioners::Resend) }

  before do
    allow(ProviderWebhookProvisioners).to receive(:for).with("resend").and_return(provisioner)
  end

  it "applies a successful provision result onto the connection" do
    allow(provisioner).to receive(:provision).and_return(
      success:        true,
      status:         "auto",
      external_id:    "wh_abc",
      signing_secret: "whsec_xyz"
    )

    described_class.new.perform(connection.id)

    connection.reload
    expect(connection.webhook_status).to eq "auto"
    expect(connection.webhook_external_id).to eq "wh_abc"
    expect(connection.webhook_last_error).to be_nil
    expect(connection.webhook_last_synced_at).to be_within(5.seconds).of(Time.current)
    expect(connection.webhook_secret).to eq "whsec_xyz"
  end

  it "records the failure reason without clearing prior signing secret" do
    connection.update!(webhook_secret: "whsec_old")
    allow(provisioner).to receive(:provision).and_return(
      success: false, status: "failed", error: "Resend create webhook failed: Unauthorized"
    )

    described_class.new.perform(connection.id)

    connection.reload
    expect(connection.webhook_status).to eq "failed"
    expect(connection.webhook_last_error).to include("Unauthorized")
    expect(connection.webhook_secret).to eq "whsec_old"
  end

  it "skips when the connection opts out of auto management" do
    connection.update_columns(webhook_auto_managed: false)
    expect(provisioner).not_to receive(:provision)

    described_class.new.perform(connection.id)
  end

  it "skips when provider has no auto path" do
    smtp = create(:provider_connection, :smtp, tenant: tenant)
    expect(ProviderWebhookProvisioners).not_to receive(:for)

    described_class.new.perform(smtp.id)
  end

  it "leaves prior signing secret in place when provisioner returns needs_signing_key" do
    connection.update!(webhook_secret: "whsec_old")
    allow(provisioner).to receive(:provision).and_return(
      success: true, status: "needs_signing_key", external_id: "wh_abc", signing_secret: nil
    )

    described_class.new.perform(connection.id)

    connection.reload
    expect(connection.webhook_status).to eq "needs_signing_key"
    expect(connection.webhook_secret).to eq "whsec_old"
  end
end
