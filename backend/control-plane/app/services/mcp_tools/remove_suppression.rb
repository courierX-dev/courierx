# frozen_string_literal: true

module McpTools
  class RemoveSuppression < Base
    def call
      email = args[:email].to_s.downcase.strip
      return error("Missing 'email'") if email.empty?

      record = tenant.suppressions.find_by(email: email)
      return error("No suppression found for #{email}") unless record

      record.destroy
      ok("Removed suppression for #{email}", { email: email })
    end
  end
end
