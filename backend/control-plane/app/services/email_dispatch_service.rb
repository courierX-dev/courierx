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
    # 0. Resolve template if template_id is provided
    resolve_template! if @params[:template_id].present?

    # 1. Idempotency check
    idem_key = @params.dig(:metadata, :idempotency_key)
    if idem_key.present?
      existing = @tenant.emails
                        .where("metadata->>'idempotency_key' = ?", idem_key)
                        .where("created_at > ?", 24.hours.ago)
                        .first
      return { success: true, email: existing, idempotent: true } if existing
    end

    # 2. Verify from_email belongs to a verified tenant domain.
    #    Demo-mode tenants skip this gate — they send through the mock provider
    #    in the Go engine so new users can exercise the send flow immediately
    #    after signup, before any DNS setup.
    unless @tenant.mode == "demo"
      from_domain = @params[:from_email]&.split("@")&.last&.downcase
      unless @tenant.domains.where(status: "verified").exists?(["LOWER(domain) = ?", from_domain])
        return { success: false, error: "from_email domain '#{from_domain}' is not a verified domain on this account" }
      end
    end

    # 3. Check suppression list
    if Suppression.suppressed?(@tenant.id, @params[:to_email])
      email = create_email(status: "suppressed")
      return { success: false, error: "Recipient is suppressed", email: email }
    end

    # 4+5. Create email record and outbox event atomically. A crash between the
    # two writes would otherwise leave an email stuck in "queued" forever with no
    # processor event to deliver it.
    email = outbox = nil
    ActiveRecord::Base.transaction do
      email = create_email!(status: "queued")
      outbox = OutboxEvent.create!(
        event_type: "send_email",
        payload: { email_id: email.id, tenant_id: @tenant.id, idempotency_key: idem_key }.compact,
        status: "pending"
      )
      email.update!(outbox_event_id: outbox.id)
    end

    # 5. Enqueue Sidekiq job for immediate processing
    OutboxProcessorJob.perform_async(outbox.id)

    { success: true, email: email }
  rescue => e
    { success: false, error: e.message }
  end

  private

  def resolve_template!
    template = @tenant.email_templates.find(@params[:template_id])
    variables = @params[:variables] || {}
    rendered = template.render_preview(variables)

    @template = template
    # Template fields fill in blanks — explicit params take priority
    @params[:subject]   ||= rendered[:subject]
    @params[:html_body] ||= rendered[:html_body]
    @params[:text_body] ||= rendered[:text_body]
  end

  def create_email(status:)
    @tenant.emails.create(
      from_email:        @params[:from_email],
      from_name:         @params[:from_name],
      to_email:          @params[:to_email],
      to_name:           @params[:to_name],
      reply_to:          @params[:reply_to],
      subject:           @params[:subject],
      html_body:         @params[:html_body],
      text_body:         @params[:text_body],
      tags:              @params[:tags] || [],
      metadata:          @params[:metadata] || {},
      email_template:    @template,
      status:            status
    )
  end

  def create_email!(status:)
    @tenant.emails.create!(
      from_email:        @params[:from_email],
      from_name:         @params[:from_name],
      to_email:          @params[:to_email],
      to_name:           @params[:to_name],
      reply_to:          @params[:reply_to],
      subject:           @params[:subject],
      html_body:         @params[:html_body],
      text_body:         @params[:text_body],
      tags:              @params[:tags] || [],
      metadata:          @params[:metadata] || {},
      email_template:    @template,
      status:            status
    )
  end
end
