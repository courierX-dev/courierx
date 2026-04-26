# frozen_string_literal: true

module ProviderWebhookProvisioners
  # Fallback for providers without an auto path (SES, SMTP, anything new).
  # `provision` reports failure so the controller surfaces a clear message;
  # `revoke` is a no-op success.
  class NullProvisioner < Base
    def provision(_connection)
      failure("Auto webhook provisioning is not supported for this provider")
    end

    def revoke(_connection)
      { success: true }
    end
  end
end
