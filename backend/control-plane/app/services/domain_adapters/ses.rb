# frozen_string_literal: true

module DomainAdapters
  # AWS SES domain identity — stub.
  # API: SESv2.CreateEmailIdentity / GetEmailIdentity
  # TODO: use aws-sdk-sesv2 gem; call create_email_identity, read DkimAttributes.Tokens
  # to build three CNAME records (token._domainkey.domain → token.dkim.amazonses.com).
  class Ses < Base
    def register(_domain, _connection)
      { success: false, error: "AWS SES propagation not yet implemented — add identity via SES console" }
    end

    def verify(_domain, _connection, external_id: nil)
      { verified: false, error: "AWS SES verification not yet implemented" }
    end
  end
end
