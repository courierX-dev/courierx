# frozen_string_literal: true

# EmailDispatchService
#
# Entry point for sending an email. Validates input, checks suppressions,
# creates the Email record + OutboxEvent, and enqueues the Sidekiq job.
#
# Usage:
#   result = EmailDispatchService.call(tenant: tenant, params: { to_email: "...", ... })
#   result[:success] # => true/false
#   result[:email]   # => Email record
#   result[:error]   # => error message on failure
#
class EmailDispatchService
  def self.call(tenant:, params:)
    new(tenant, params).call
  end

  def initialize(tenant, params)
    @tenant = tenant
    @params = params
  end

  def call
    # 0. Idempotency check
    if (idem_key = @params.dig(:metadata, :idempotency_key)).present?
      existing = @tenant.emails
                        .where("metadata->>'idempotency_key' = ?", idem_key)
                        .where("created_at > ?", 24.hours.ago)
                        .first
      return { success: true, email: existing, idempotent: true } if existing
    end

    # 1. Check suppression list
    if Suppression.suppressed?(@tenant.id, @params[:to_email])
      email = create_email(status: "suppressed")
      return { success: false, error: "Recipient is suppressed", email: email }
    end

    # 2. Create email record
    email = create_email(status: "queued")
    return { success: false, error: email.errors.full_messages.join(", ") } unless email.persisted?

    # 3. Create outbox event
    outbox = OutboxEvent.create!(
      event_type: "send_email",
      payload: { email_id: email.id, tenant_id: @tenant.id },
      status: "pending"
    )

    email.update!(outbox_event_id: outbox.id)

    # 4. Enqueue Sidekiq job for immediate processing
    OutboxProcessorJob.perform_async(outbox.id)

    { success: true, email: email }
  end

  private

  def create_email(status:)
    @tenant.emails.create(
      from_email: @params[:from_email],
      from_name:  @params[:from_name],
      to_email:   @params[:to_email],
      to_name:    @params[:to_name],
      reply_to:   @params[:reply_to],
      subject:    @params[:subject],
      html_body:  @params[:html_body],
      text_body:  @params[:text_body],
      tags:       @params[:tags] || [],
      metadata:   @params[:metadata] || {},
      status:     status
    )
  end
end
