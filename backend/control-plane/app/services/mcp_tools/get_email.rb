# frozen_string_literal: true

module McpTools
  class GetEmail < Base
    def call
      return error("Missing 'id'") if args[:id].blank?

      email = tenant.emails.find_by(id: args[:id])
      return error("Email not found") unless email

      data = {
        id:                  email.id,
        from_email:          email.from_email,
        to_email:            email.to_email,
        subject:             email.subject,
        status:              email.status,
        last_error:          email.last_error,
        provider:            email.provider_connection&.provider,
        provider_message_id: email.provider_message_id,
        tags:                email.tags,
        queued_at:           email.queued_at,
        sent_at:             email.sent_at,
        delivered_at:        email.delivered_at,
        created_at:          email.created_at,
        events: email.email_events.order(occurred_at: :desc).map { |ev|
          {
            event_type:  ev.event_type,
            occurred_at: ev.occurred_at,
            provider:    ev.provider,
            bounce_type: ev.bounce_type
          }
        }
      }

      ok("Email #{email.id} (#{email.status})", data)
    end
  end
end
