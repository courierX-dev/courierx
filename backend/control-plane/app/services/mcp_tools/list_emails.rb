# frozen_string_literal: true

module McpTools
  class ListEmails < Base
    def call
      scope = tenant.emails.recent
      scope = scope.by_status(args[:status])                                if args[:status].present?
      scope = scope.where("to_email ILIKE ?", "%#{args[:recipient]}%")       if args[:recipient].present?

      limit = args[:limit].to_i
      limit = 25 if limit <= 0
      limit = [limit, 100].min

      records = scope.limit(limit).map { |e| serialize(e) }
      ok("Found #{records.size} email(s)", { emails: records })
    end

    private

    def serialize(email)
      {
        id:           email.id,
        from_email:   email.from_email,
        to_email:     email.to_email,
        subject:      email.subject,
        status:       email.status,
        provider:     email.provider_connection&.provider,
        sent_at:      email.sent_at,
        delivered_at: email.delivered_at,
        created_at:   email.created_at
      }
    end
  end
end
