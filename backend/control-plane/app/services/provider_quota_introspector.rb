# frozen_string_literal: true

# ProviderQuotaIntrospector
#
# Queries a provider's own API to fetch the real account-level send caps
# (Max24Hour, monthly plan limits, etc.) and writes them onto the
# ProviderQuota row with cap_source: "api_introspected". Falls back
# silently if the provider doesn't expose introspection or the call fails —
# the seeded template values stay in place so cap-aware routing still has
# something sensible to filter on.
#
# Returns a Result describing what happened. Callers (the job) log + persist.
#
# Reset strategies are intentionally NOT changed by introspection — they're
# a property of the *plan* (rolling 24h vs calendar month vs billing cycle)
# that the provider doesn't always expose. Templates seed a sensible default;
# operators can correct via the dashboard if needed.
class ProviderQuotaIntrospector
  Result = Struct.new(:status, :daily_cap, :monthly_cap, :detail, keyword_init: true) do
    def ok?; status == :ok; end
  end

  TIMEOUT_SECONDS = 10

  def self.call(provider_connection)
    new(provider_connection).call
  end

  def initialize(provider_connection)
    @pc = provider_connection
  end

  def call
    case @pc.provider
    when "sendgrid" then introspect_sendgrid
    when "mailgun"  then introspect_mailgun
    when "aws_ses"  then introspect_ses
    when "postmark" then introspect_postmark
    when "brevo"    then introspect_brevo
    else
      skip("introspection not implemented for #{@pc.provider}")
    end
  rescue => e
    Rails.logger.warn("[QuotaIntrospect] connection=#{@pc.id} #{e.class}: #{e.message}")
    skip("error: #{e.class}: #{e.message}")
  end

  private

  # SendGrid: GET /v3/user/credits — only returns useful data on plans that
  # use the credit model (Pro tier and below). On plans without credits it
  # 404s; on free without addon it can return remain/total but no cap.
  # https://docs.sendgrid.com/api-reference/users-api/retrieve-your-credit-balance
  def introspect_sendgrid
    api_key = @pc.api_key
    return skip("sendgrid: no api key") if api_key.blank?

    response = build_faraday("https://api.sendgrid.com") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
    end.get("/v3/user/credits")

    case response.status
    when 200
      data  = JSON.parse(response.body) rescue {}
      total = data["total"]
      reset = data["next_reset"]
      if total.is_a?(Numeric) && total.positive?
        # SendGrid resets are typically monthly on the credit plan.
        ok(daily_cap: nil, monthly_cap: total.to_i,
           detail: "credits.total=#{total} next_reset=#{reset}")
      else
        skip("sendgrid: credits endpoint returned no usable cap")
      end
    when 401, 403
      skip("sendgrid: auth failed (#{response.status})")
    when 404
      skip("sendgrid: credits endpoint not available on this plan")
    else
      skip("sendgrid: HTTP #{response.status}")
    end
  end

  # Mailgun: GET /v5/accounts — account-level plan info, including monthly
  # send limit on metered plans. Free/trial accounts often don't expose a
  # numeric limit here; in that case we keep the template default.
  # https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Accounts/
  def introspect_mailgun
    api_key = @pc.api_key
    return skip("mailgun: no api key") if api_key.blank?

    region = @pc.region.presence || "us"
    base   = region == "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net"

    response = build_faraday(base) do |req|
      req.headers["Authorization"] = "Basic " + Base64.strict_encode64("api:#{api_key}")
    end.get("/v5/accounts")

    case response.status
    when 200
      data  = JSON.parse(response.body) rescue {}
      plan  = data["plan"] || {}
      limit = plan["monthly_email_limit"] || plan["email_limit"] || data["monthly_email_limit"]
      if limit.is_a?(Numeric) && limit.positive?
        ok(daily_cap: nil, monthly_cap: limit.to_i, detail: "plan=#{plan['name'] || plan['id']}")
      else
        skip("mailgun: account endpoint returned no usable limit")
      end
    when 401, 403
      skip("mailgun: auth failed (#{response.status})")
    when 404
      skip("mailgun: accounts endpoint unavailable")
    else
      skip("mailgun: HTTP #{response.status}")
    end
  end

  # SES: GetSendQuota — returns Max24HourSend (sandbox: 200, production: 50k+),
  # MaxSendRate (per second), and SentLast24Hours. We surface Max24HourSend as
  # `daily_cap` with reset_strategy already set to "rolling_24h" by the template.
  #
  # Uses SigV4 query signing for SES (us-east-1-style endpoint). No aws-sdk
  # gem is in the Gemfile, so we sign manually — the request shape is small
  # and well-documented:
  # https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetSendQuota.html
  def introspect_ses
    access_key = @pc.api_key
    secret_key = @pc.secret
    region     = @pc.region.presence || "us-east-1"
    return skip("ses: missing credentials") if access_key.blank? || secret_key.blank?

    host       = "email.#{region}.amazonaws.com"
    service    = "ses"
    method     = "POST"
    path       = "/"
    body       = "Action=GetSendQuota&Version=2010-12-01"
    amz_date   = Time.now.utc.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = Time.now.utc.strftime("%Y%m%d")

    payload_hash = OpenSSL::Digest::SHA256.hexdigest(body)
    canonical_headers = "content-type:application/x-www-form-urlencoded\nhost:#{host}\nx-amz-date:#{amz_date}\n"
    signed_headers    = "content-type;host;x-amz-date"
    canonical_request = [method, path, "", canonical_headers, signed_headers, payload_hash].join("\n")

    credential_scope = "#{date_stamp}/#{region}/#{service}/aws4_request"
    string_to_sign   = ["AWS4-HMAC-SHA256", amz_date, credential_scope,
                        OpenSSL::Digest::SHA256.hexdigest(canonical_request)].join("\n")

    k_date    = OpenSSL::HMAC.digest("sha256", "AWS4#{secret_key}", date_stamp)
    k_region  = OpenSSL::HMAC.digest("sha256", k_date, region)
    k_service = OpenSSL::HMAC.digest("sha256", k_region, service)
    k_signing = OpenSSL::HMAC.digest("sha256", k_service, "aws4_request")
    signature = OpenSSL::HMAC.hexdigest("sha256", k_signing, string_to_sign)

    auth = "AWS4-HMAC-SHA256 Credential=#{access_key}/#{credential_scope}, " \
           "SignedHeaders=#{signed_headers}, Signature=#{signature}"

    response = build_faraday("https://#{host}") do |req|
      req.headers["Content-Type"] = "application/x-www-form-urlencoded"
      req.headers["X-Amz-Date"]   = amz_date
      req.headers["Authorization"] = auth
    end.post(path, body)

    case response.status
    when 200
      max24 = response.body[%r{<Max24HourSend>([0-9.]+)</Max24HourSend>}, 1]
      sent  = response.body[%r{<SentLast24Hours>([0-9.]+)</SentLast24Hours>}, 1]
      if max24
        # Sandbox returns -1 for unlimited "production" (rare); negative or
        # zero means no usable cap.
        cap = max24.to_f.to_i
        return skip("ses: Max24HourSend=#{max24} (no positive cap)") if cap <= 0
        ok(daily_cap: cap, monthly_cap: nil,
           detail: "Max24HourSend=#{cap} SentLast24Hours=#{sent}")
      else
        skip("ses: response did not contain Max24HourSend")
      end
    when 401, 403
      skip("ses: auth failed (#{response.status})")
    else
      skip("ses: HTTP #{response.status}")
    end
  end

  # Postmark: per-server token can hit /server but doesn't expose plan limits.
  # Plan-level limits live behind the Account API (separate token). We skip
  # rather than guess — operators can adjust caps manually if needed.
  # https://postmarkapp.com/developer/api/server-api
  def introspect_postmark
    skip("postmark: server-token has no plan-level quota endpoint; use manual cap")
  end

  # Brevo: GET /v3/account — `plan` array contains current credits. The "email"
  # plan entry has `credits` (remaining) and `creditsType`. Brevo doesn't
  # publish a fixed daily/monthly cap — the credits value is what's left this
  # month on the plan. Persist as `monthly_cap` so cap-aware routing has a
  # ceiling.
  # https://developers.brevo.com/reference/getaccount
  def introspect_brevo
    api_key = @pc.api_key
    return skip("brevo: no api key") if api_key.blank?

    response = build_faraday("https://api.brevo.com") do |req|
      req.headers["api-key"]      = api_key
      req.headers["Accept"]       = "application/json"
    end.get("/v3/account")

    case response.status
    when 200
      data    = JSON.parse(response.body) rescue {}
      plan    = Array(data["plan"]).find { |p| p["type"].to_s.downcase.include?("email") } ||
                Array(data["plan"]).first || {}
      credits = plan["credits"]
      if credits.is_a?(Numeric) && credits.positive?
        ok(daily_cap: nil, monthly_cap: credits.to_i,
           detail: "plan=#{plan['type']} credits=#{credits}")
      else
        skip("brevo: account returned no usable credits")
      end
    when 401, 403
      skip("brevo: auth failed (#{response.status})")
    else
      skip("brevo: HTTP #{response.status}")
    end
  end

  def ok(daily_cap:, monthly_cap:, detail:)
    Result.new(status: :ok, daily_cap: daily_cap, monthly_cap: monthly_cap, detail: detail)
  end

  def skip(detail)
    Result.new(status: :skipped, daily_cap: nil, monthly_cap: nil, detail: detail)
  end

  def build_faraday(base_url)
    Faraday.new(url: base_url) do |f|
      f.options.timeout      = TIMEOUT_SECONDS
      f.options.open_timeout = TIMEOUT_SECONDS
      yield(f) if block_given?
    end
  end
end
