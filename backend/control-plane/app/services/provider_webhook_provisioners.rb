# frozen_string_literal: true

# ProviderWebhookProvisioners — auto-creates inbound webhooks on the tenant's
# provider account using their BYOK credentials, so the user doesn't have to
# paste URLs and signing secrets by hand.
#
# Each provisioner lives in its own file under
# app/services/provider_webhook_provisioners/ and inherits from Base.
# Contract:
#
#   #provision(connection) → {
#     success:        true|false,
#     status:         "auto"|"needs_signing_key"|"failed",
#     external_id:    "wh_..." or nil,
#     signing_secret: "whsec_..." or nil,
#     error:          "human readable message" (only on failure)
#   }
#
#   #revoke(connection) → { success:, error: } — best-effort; idempotent
#     (a 404 from the provider counts as success).
#
module ProviderWebhookProvisioners
  EVENT_SUBSCRIPTIONS = %w[
    delivered
    bounced
    complained
    opened
    clicked
    unsubscribed
    delivery_delayed
  ].freeze

  def self.for(provider)
    case provider
    when "resend"   then Resend.new
    when "postmark" then Postmark.new
    when "sendgrid" then Sendgrid.new
    when "mailgun"  then Mailgun.new
    else                  NullProvisioner.new
    end
  end
end
