# frozen_string_literal: true

# ProviderEventProcessor
#
# Shared service called by all inbound provider webhook controllers.
# Takes a normalized event hash, updates the Email record, creates an
# EmailEvent, auto-suppresses hard bounces / complaints, and fires
# outbound WebhookDeliveryJob to notify the tenant.
#
#   ProviderEventProcessor.call(
#     provider:            "sendgrid",
#     provider_message_id: "abc123",
#     event_type:          "delivered",    # delivered|bounced|complained|opened|clicked
#     occurred_at:         Time.current,
#     recipient:           "user@example.com",
#     bounce_type:         nil,            # permanent | temporary (for bounces)
#     bounce_code:         nil,            # e.g. "550"
#     bounce_message:      nil,
#     link_url:            nil,            # for click events
#     user_agent:          nil,
#     ip_address:          nil,
#     raw_payload:         {}
#   )
#
class ProviderEventProcessor
  Result = Struct.new(:success, :email, :event, :error, keyword_init: true)

  def self.call(**args)
    new(**args).call
  end

  def initialize(provider:, provider_message_id:, event_type:, occurred_at:, recipient: nil,
                 bounce_type: nil, bounce_code: nil, bounce_message: nil,
                 link_url: nil, user_agent: nil, ip_address: nil, raw_payload: {})
    @provider            = provider
    @provider_message_id = provider_message_id
    @event_type          = event_type
    @occurred_at         = occurred_at || Time.current
    @recipient           = recipient
    @bounce_type         = bounce_type
    @bounce_code         = bounce_code
    @bounce_message      = bounce_message
    @link_url            = link_url
    @user_agent          = user_agent
    @ip_address          = ip_address
    @raw_payload         = raw_payload
  end

  def call
    email = find_email
    return Result.new(success: false, error: "Email not found for provider_message_id: #{@provider_message_id}") unless email

    # Create the event record
    event = email.email_events.create!(
      event_type:    @event_type,
      occurred_at:   @occurred_at,
      provider:      @provider,
      bounce_type:   @bounce_type.presence,
      bounce_code:   @bounce_code.presence,
      bounce_message: @bounce_message.presence,
      link_url:      @link_url.presence,
      user_agent:    @user_agent.presence,
      ip_address:    @ip_address.presence,
      raw_payload:   @raw_payload
    )

    # Update email status
    update_email_status!(email)

    # Auto-suppress on hard bounce or complaint
    auto_suppress!(email) if should_suppress?

    # Fire outbound webhook to tenant
    fire_tenant_webhooks!(email, event)

    Result.new(success: true, email: email, event: event)
  rescue => e
    Rails.logger.error("[ProviderEventProcessor] Error processing #{@event_type} for #{@provider_message_id}: #{e.message}")
    Result.new(success: false, error: e.message)
  end

  private

  def find_email
    Email.find_by(provider_message_id: @provider_message_id)
  end

  def update_email_status!(email)
    case @event_type
    when "delivered"
      email.mark_delivered! if email.status.in?(%w[sent queued])
    when "bounced"
      email.mark_bounced!(error: @bounce_message || "Bounced (#{@bounce_code})") if email.status.in?(%w[sent queued delivered])
    when "complained"
      email.update!(status: "complained") if email.status.in?(%w[sent delivered])
    when "failed"
      email.mark_failed!(error: @bounce_message || "Delivery failed") if email.status.in?(%w[sent queued])
    end
    # opened, clicked, unsubscribed don't change email status
  end

  def should_suppress?
    (@event_type == "bounced" && @bounce_type == "permanent") ||
      @event_type == "complained" ||
      @event_type == "unsubscribed"
  end

  def auto_suppress!(email)
    reason = case @event_type
             when "bounced"      then "hard_bounce"
             when "complained"   then "complaint"
             when "unsubscribed" then "unsubscribe"
             end

    Suppression.find_or_create_by!(
      tenant: email.tenant,
      email:  (email.to_email || @recipient).downcase.strip
    ) do |s|
      s.reason = reason
    end
  rescue ActiveRecord::RecordNotUnique
    # Already suppressed — race condition safe
  end

  def fire_tenant_webhooks!(email, event)
    endpoints = email.tenant.webhook_endpoints.where(is_active: true)

    endpoints.each do |endpoint|
      next unless endpoint.events.include?(@event_type)

      payload = {
        event:      @event_type,
        message_id: email.id,
        to:         email.to_email,
        from:       email.from_email,
        subject:    email.subject,
        provider:   @provider,
        timestamp:  @occurred_at.iso8601,
        data:       {
          bounce_type:    @bounce_type,
          bounce_code:    @bounce_code,
          bounce_message: @bounce_message,
          link_url:       @link_url,
          user_agent:     @user_agent,
          ip_address:     @ip_address
        }.compact
      }

      WebhookDeliveryJob.perform_async(endpoint.id, payload.deep_stringify_keys)
    end
  end
end
