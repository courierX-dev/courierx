# frozen_string_literal: true

module DomainAdapters
  # Mailgun domain registration — stub.
  # API: https://documentation.mailgun.com/en/latest/api-domains.html
  # TODO: POST /v3/domains with name=domain; parse sending_dns_records +
  # receiving_dns_records into record list.
  class Mailgun < Base
    def register(_domain, _connection)
      { success: false, error: "Mailgun propagation not yet implemented — add records manually via Mailgun dashboard" }
    end

    def verify(_domain, _connection, external_id: nil)
      { verified: false, error: "Mailgun verification not yet implemented" }
    end
  end
end
