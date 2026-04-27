# frozen_string_literal: true

# ProviderStatusPoller
#
# Pull-side counterpart to the inbound provider webhook flow. Used by the
# reconciler when an email is in `sent` status but no delivery webhook ever
# arrived (provider webhook misconfigured, signing key wrong, transient
# webhook outage, etc.).
#
# When polling discovers a terminal event, it routes it through the same
# ProviderEventProcessor that webhook controllers use, so suppression and
# tenant webhook fan-out happen identically regardless of how the event
# was discovered.
#
# Returns a Result describing what happened. `found: true` means a terminal
# event was applied. `found: false` covers everything else (still in flight,
# polling unsupported, transport error) — caller decides whether to mark the
# email failed based on age.
class ProviderStatusPoller
  Result = Struct.new(:found, :summary, keyword_init: true) do
    def found?; found; end
  end

  TIMEOUT_SECONDS = 10

  def self.call(email:)
    new(email).call
  end

  def initialize(email)
    @email = email
  end

  def call
    return Result.new(found: false, summary: "no provider_connection")  unless @email.provider_connection
    return Result.new(found: false, summary: "no provider_message_id")  if @email.provider_message_id.blank?

    case @email.provider_connection.provider
    when "sendgrid" then poll_sendgrid
    when "resend"   then poll_resend
    when "postmark" then poll_postmark
    when "mailgun"  then poll_mailgun
    else
      Result.new(found: false, summary: "polling not implemented for #{@email.provider_connection.provider}")
    end
  rescue => e
    Rails.logger.warn("[ProviderStatusPoller] email=#{@email.id}: #{e.class} #{e.message}")
    Result.new(found: false, summary: "polling error: #{e.class}: #{e.message}")
  end

  private

  # SendGrid Email Activity API. Requires the "Email Activity" addon — accounts
  # without it return 404 and we treat that as "polling unsupported".
  # https://docs.sendgrid.com/api-reference/e-mail-activity/filter-all-messages
  def poll_sendgrid
    api_key = @email.provider_connection.api_key
    return Result.new(found: false, summary: "sendgrid: no api key") if api_key.blank?

    conn = build_faraday("https://api.sendgrid.com") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
    end

    response = conn.get("/v3/messages") do |req|
      req.params["query"] = %(msg_id="#{@email.provider_message_id}")
      req.params["limit"] = 1
    end

    case response.status
    when 200
      messages = (JSON.parse(response.body)["messages"] rescue []) || []
      msg = messages.first
      return Result.new(found: false, summary: "sendgrid: not found in activity feed") unless msg

      event_type = sendgrid_status_to_event(msg["status"])
      if event_type
        apply_event!("sendgrid", event_type, raw: msg, message: msg["reason"])
        Result.new(found: true, summary: "sendgrid status=#{msg['status']} → #{event_type}")
      else
        Result.new(found: false, summary: "sendgrid status=#{msg['status']} (still in flight)")
      end
    when 401, 403
      Result.new(found: false, summary: "sendgrid: auth failed (#{response.status})")
    when 404
      Result.new(found: false, summary: "sendgrid: Email Activity addon not enabled")
    else
      Result.new(found: false, summary: "sendgrid: HTTP #{response.status}")
    end
  end

  def sendgrid_status_to_event(status)
    case status
    when "delivered"     then "delivered"
    when "not_delivered" then "bounced"
    end
  end

  # Resend: GET /emails/{id}
  # https://resend.com/docs/api-reference/emails/retrieve-email
  def poll_resend
    api_key = @email.provider_connection.api_key
    return Result.new(found: false, summary: "resend: no api key") if api_key.blank?

    conn = build_faraday("https://api.resend.com") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
    end

    response = conn.get("/emails/#{@email.provider_message_id}")
    case response.status
    when 200
      data = JSON.parse(response.body) rescue {}
      last_event = data["last_event"].to_s
      event_type = case last_event
                   when "delivered"  then "delivered"
                   when "bounced"    then "bounced"
                   when "complained" then "complained"
                   end
      if event_type
        occurred = parse_time(data["last_event_at"])
        apply_event!("resend", event_type, raw: data, occurred_at: occurred)
        Result.new(found: true, summary: "resend last_event=#{last_event} → #{event_type}")
      else
        Result.new(found: false, summary: "resend last_event=#{last_event} (no terminal event)")
      end
    when 401, 403
      Result.new(found: false, summary: "resend: auth failed (#{response.status})")
    when 404
      Result.new(found: false, summary: "resend: message not found")
    else
      Result.new(found: false, summary: "resend: HTTP #{response.status}")
    end
  end

  # Postmark: GET /messages/outbound/{id}/details
  # https://postmarkapp.com/developer/api/messages-api#outbound-message-details
  def poll_postmark
    token = @email.provider_connection.api_key
    return Result.new(found: false, summary: "postmark: no server token") if token.blank?

    conn = build_faraday("https://api.postmarkapp.com") do |req|
      req.headers["X-Postmark-Server-Token"] = token
    end

    response = conn.get("/messages/outbound/#{@email.provider_message_id}/details")
    case response.status
    when 200
      data = JSON.parse(response.body) rescue {}
      pm_status = data["Status"].to_s
      event_type = case pm_status
                   when "Delivered"             then "delivered"
                   when "Bounced", "HardBounced" then "bounced"
                   when "SpamComplaint"          then "complained"
                   end
      if event_type
        apply_event!("postmark", event_type, raw: data)
        Result.new(found: true, summary: "postmark Status=#{pm_status} → #{event_type}")
      else
        Result.new(found: false, summary: "postmark Status=#{pm_status} (no terminal event)")
      end
    when 401, 403
      Result.new(found: false, summary: "postmark: auth failed (#{response.status})")
    when 404
      Result.new(found: false, summary: "postmark: message not found")
    else
      Result.new(found: false, summary: "postmark: HTTP #{response.status}")
    end
  end

  # Mailgun: GET /v3/{domain}/events?message-id=... (no leading <>, but
  # Mailgun sometimes returns the id with <> wrappers — strip them).
  # https://documentation.mailgun.com/en/latest/api-events.html
  def poll_mailgun
    api_key = @email.provider_connection.api_key
    domain  = @email.provider_connection.smtp_host  # repurposed field
    return Result.new(found: false, summary: "mailgun: no api key") if api_key.blank?
    return Result.new(found: false, summary: "mailgun: no sending domain") if domain.blank?

    region = @email.provider_connection.region.presence || "us"
    base   = region == "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net"

    conn = build_faraday(base) do |req|
      req.headers["Authorization"] = "Basic " + Base64.strict_encode64("api:#{api_key}")
    end

    msg_id = @email.provider_message_id.to_s.tr("<>", "")
    response = conn.get("/v3/#{domain}/events") do |req|
      req.params["message-id"] = msg_id
      req.params["limit"]      = 5
    end

    case response.status
    when 200
      items = (JSON.parse(response.body)["items"] rescue []) || []
      # Pick the strongest terminal event present. Order matters: complained
      # > bounced > failed > delivered (lowest priority because delivered can
      # later be followed by a complaint).
      ranked = %w[complained failed bounced delivered]
      pick = nil
      ranked.each do |target|
        evt = items.find { |i| mailgun_event_to_internal(i["event"]) == target }
        if evt
          pick = [target, evt]
          break
        end
      end

      if pick
        event_type, evt = pick
        occurred = parse_time(evt["timestamp"]) || Time.current
        apply_event!("mailgun", event_type, raw: evt, occurred_at: occurred,
                     message: evt.dig("delivery-status", "description"))
        Result.new(found: true, summary: "mailgun event=#{evt['event']} → #{event_type}")
      else
        Result.new(found: false, summary: "mailgun: no terminal events for message")
      end
    when 401, 403
      Result.new(found: false, summary: "mailgun: auth failed (#{response.status})")
    else
      Result.new(found: false, summary: "mailgun: HTTP #{response.status}")
    end
  end

  def mailgun_event_to_internal(event)
    case event
    when "delivered"  then "delivered"
    when "failed"     then "bounced"   # Mailgun reports bounces as failed w/ severity
    when "complained" then "complained"
    when "rejected"   then "failed"
    end
  end

  def apply_event!(provider, event_type, raw:, occurred_at: nil, message: nil)
    ProviderEventProcessor.call(
      provider:            provider,
      provider_message_id: @email.provider_message_id,
      event_type:          event_type,
      occurred_at:         occurred_at || Time.current,
      recipient:           @email.to_email,
      bounce_message:      message,
      raw_payload:         raw.is_a?(Hash) ? raw.merge("_source" => "reconciler_poll") : { "_source" => "reconciler_poll" }
    )
  end

  def parse_time(value)
    return nil if value.blank?
    return Time.at(value.to_f) if value.is_a?(Numeric) || value.to_s =~ /\A\d+(\.\d+)?\z/
    Time.parse(value.to_s) rescue nil
  end

  def build_faraday(base_url)
    Faraday.new(url: base_url) do |f|
      f.options.timeout      = TIMEOUT_SECONDS
      f.options.open_timeout = TIMEOUT_SECONDS
      yield(f) if block_given?
    end
  end
end
