# frozen_string_literal: true

# Backfills webhook_token on provider_connections rows that predate the
# `before_validation :ensure_webhook_token` hook. Without a token, the
# computed webhook URL is nil and ProviderWebhookProvisionJob fails with
# "Missing webhook URL".
class BackfillProviderConnectionWebhookTokens < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    say_with_time "Backfilling webhook_token for legacy provider_connections" do
      # Use raw SQL with a generated random token so we don't go through
      # ActiveRecord callbacks. urlsafe_base64(24) → 32 chars after stripping
      # `-`/`_` (matches the model's ensure_webhook_token format).
      ProviderConnection.where(webhook_token: nil).find_each(batch_size: 200) do |c|
        c.update_columns(
          webhook_token: SecureRandom.urlsafe_base64(24).tr("-_", "ab")
        )
      end
    end
  end

  def down
    # No-op — tokens are still valid even if we no longer require them.
  end
end
