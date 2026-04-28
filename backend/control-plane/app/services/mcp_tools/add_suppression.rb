# frozen_string_literal: true

module McpTools
  class AddSuppression < Base
    def call
      email = args[:email].to_s.downcase.strip
      return error("Missing 'email'") if email.empty?

      reason = args[:reason].presence || "manual"
      record = tenant.suppressions.find_or_initialize_by(email: email)
      record.reason = reason

      if record.save
        ok("Suppressed #{email} (#{reason})", { email: email, reason: reason })
      else
        error(record.errors.full_messages.to_sentence)
      end
    end
  end
end
