# frozen_string_literal: true

module DomainAdapters
  # Postmark domain registration — stub.
  # API: https://postmarkapp.com/developer/api/domains-api
  # TODO: POST /domains with Name=domain; parse DKIMHost/DKIMTextValue and
  # ReturnPathDomainCNAMEValue into records.
  class Postmark < Base
    def register(_domain, _connection)
      { success: false, error: "Postmark propagation not yet implemented — add domain via Postmark dashboard" }
    end

    def verify(_domain, _connection, external_id: nil)
      { verified: false, error: "Postmark verification not yet implemented" }
    end
  end
end
