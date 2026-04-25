# frozen_string_literal: true

# EmailErrorTranslator
#
# Maps raw provider/internal error strings to user-facing messages with
# actionable CTAs. The frontend should read `display_message` and `display_cta`
# instead of parsing `last_error` itself — translations live in one place so
# a copy change updates everywhere.
#
# Voice: direct, specific, no spin. Following the brand voice guide.
#
# Usage:
#   t = EmailErrorTranslator.translate(error: email.last_error,
#                                      from_email: email.from_email)
#   t.message   # => "Resend hasn't verified 'send.courierx.dev' yet..."
#   t.cta       # => { label: "Open Resend Domains", url: "https://..." }
#
# Returns Translation.new(message: nil, cta: nil) when error is blank.
class EmailErrorTranslator
  Translation = Struct.new(:message, :cta, :secondary_cta, keyword_init: true) do
    def to_h = { message: message, cta: cta, secondary_cta: secondary_cta }.compact
  end

  TRANSLATIONS = [
    # ── Pre-flight rejections (from EligibleConnectionsResolver) ─────────────
    { match: /no_eligible_provider:no_verified_provider/i,
      message: "No connected provider has '%<from_domain>s' verified. Verify the domain on at least one of your connected providers — see the domain's setup panel.",
      cta: { label: "Open domain setup", action: "open_domain", args: { domain: "%<from_domain>s" } } },

    { match: /no_eligible_provider:unverified_domain/i,
      message: "Sending domain '%<from_domain>s' isn't verified on this account. Add it under Domains and complete DNS verification.",
      cta: { label: "Add domain", action: "open_domain", args: { domain: "%<from_domain>s" } } },

    { match: /no_eligible_provider:all_unhealthy/i,
      message: "All providers eligible for '%<from_domain>s' are currently degraded or inactive.",
      cta: { label: "View providers", action: "open_providers" } },

    { match: /no_eligible_provider:all_over_cap/i,
      message: "Every provider eligible for '%<from_domain>s' has hit its cap for this period. Increase a cap or connect another provider.",
      cta: { label: "View provider caps", action: "open_providers" } },

    # ── Resend ───────────────────────────────────────────────────────────────
    { match: /resend.*403.*domain.*not verified/i,
      message: "Resend hasn't verified '%<from_domain>s'. Add it on Resend, complete the DNS records there, then retry.",
      cta:           { label: "Open Resend Domains", url: "https://resend.com/domains" },
      secondary_cta: { label: "Re-check verification", action: "verify_domain_provider", args: { provider: "resend" } } },

    { match: /resend.*40[12]/i,
      message: "Resend rejected your API key. The key may have been revoked. Generate a new one and update it in Provider Connections.",
      cta: { label: "Update connection", action: "edit_provider_connection", args: { provider: "resend" } } },

    # ── SendGrid ─────────────────────────────────────────────────────────────
    { match: /sendgrid.*40[123]/i,
      message: "SendGrid rejected your API key. Make sure the key has 'Mail Send' permissions enabled.",
      cta: { label: "Open SendGrid API Keys", url: "https://app.sendgrid.com/settings/api_keys" } },

    { match: /sendgrid.*from address does not match/i,
      message: "SendGrid hasn't authenticated your sending domain. Complete Domain Authentication in SendGrid, then retry.",
      cta: { label: "Open SendGrid Sender Auth", url: "https://app.sendgrid.com/settings/sender_auth" } },

    # ── Postmark ─────────────────────────────────────────────────────────────
    # Postmark returns JSON like {"ErrorCode": 10, "Message": "..."} — ErrorCode
    # 10 is "Invalid API token", 400 is "Sender signature not confirmed". Match
    # either the literal JSON shape or a "postmark:" prefix (how Go wraps errors).
    { match: /"ErrorCode":\s*10\b|postmark.*ErrorCode.*\b10\b/i,
      message: "Postmark rejected the token. Make sure you used the *Server Token* (per-server), not the Account Token.",
      cta: { label: "Open Postmark Servers", url: "https://account.postmarkapp.com/servers" } },

    { match: /"ErrorCode":\s*400\b|postmark.*ErrorCode.*\b400\b/i,
      message: "Postmark hasn't confirmed your sender signature for '%<from_domain>s'. Verify it in Postmark, then retry.",
      cta: { label: "Open Postmark Domains", url: "https://account.postmarkapp.com/sender_signatures" } },

    # ── SES ──────────────────────────────────────────────────────────────────
    { match: /SignatureDoesNotMatch|InvalidClientTokenId/,
      message: "AWS rejected the credentials. Check that the Access Key ID, Secret, and Region all match — region must be where you verified the SES identity.",
      cta: { label: "Update connection", action: "edit_provider_connection", args: { provider: "aws_ses" } } },

    { match: /MessageRejected.*not verified/,
      message: "SES sandbox: '%<from_domain>s' or the recipient isn't verified. Either verify them, or apply for SES production access.",
      cta: { label: "SES Production Access docs", url: "https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html" } },

    # ── Mailgun ──────────────────────────────────────────────────────────────
    { match: /mailgun.*40[123]/i,
      message: "Mailgun rejected your API key — often this means the key is from a different region (US vs EU) than the connection settings.",
      cta: { label: "Edit connection", action: "edit_provider_connection", args: { provider: "mailgun" } } },

    { match: /mailgun.*Domain not found/i,
      message: "Mailgun doesn't recognize '%<from_domain>s'. Add it in Mailgun first.",
      cta: { label: "Open Mailgun Domains", url: "https://app.mailgun.com/app/sending/domains" } },

    # ── SMTP ─────────────────────────────────────────────────────────────────
    { match: /smtp.*authentication failed/i,
      message: "The SMTP server rejected the username/password. For some providers (SendGrid SMTP) the username is literally 'apikey' and the password is your API key.",
      cta: nil },

    { match: /smtp.*connection refused|smtp.*timeout/i,
      message: "Couldn't reach the SMTP server. Check the host and port — many providers require enabling SMTP credentials separately from API keys.",
      cta: nil },

    # ── Internal / network ───────────────────────────────────────────────────
    { match: /Net::OpenTimeout|Errno::ECONNREFUSED.*core-go|Faraday.*ConnectionFailed/,
      message: "Internal error reaching our delivery engine. We're investigating; the message will retry automatically.",
      cta: nil },
  ].freeze

  DEFAULT = {
    message: "Provider returned an unexpected error. The technical detail below has been captured.",
    cta: nil
  }.freeze

  def self.translate(error:, from_email: nil)
    return Translation.new(message: nil) if error.blank?

    from_domain = from_email.to_s.split("@").last

    entry = TRANSLATIONS.find { |t| error.match?(t[:match]) } || DEFAULT
    Translation.new(
      message:       interpolate(entry[:message], from_domain),
      cta:           interpolate_cta(entry[:cta], from_domain),
      secondary_cta: interpolate_cta(entry[:secondary_cta], from_domain)
    )
  end

  def self.interpolate(template, from_domain)
    return nil if template.blank?
    template % { from_domain: from_domain }
  rescue KeyError
    template
  end
  private_class_method :interpolate

  def self.interpolate_cta(cta, from_domain)
    return nil if cta.nil?
    cta.transform_values do |v|
      case v
      when String then interpolate(v, from_domain)
      when Hash   then v.transform_values { |x| x.is_a?(String) ? interpolate(x, from_domain) : x }
      else v
      end
    end
  end
  private_class_method :interpolate_cta
end
