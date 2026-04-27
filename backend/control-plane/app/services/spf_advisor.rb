# frozen_string_literal: true

# SpfAdvisor
#
# Computes the merged SPF record for a domain's connected providers and warns
# when the tenant is approaching the RFC 7208 10-lookup cap. Going over the
# cap silently breaks SPF authentication — receivers return PermError and
# treat the message as un-authenticated.
#
# Returns a Result struct the dashboard renders in the domain DNS panel:
#   level == "ok"      → no banner
#   level == "warning" → amber banner: "approaching the cap, consider X"
#   level == "danger"  → red banner: "over the cap, flatten or split"
#
# Nested-lookup counts are conservative estimates from dig'ing each provider's
# include chain — accurate enough for guidance, not authoritative. A future
# enhancement could resolve live (with caching) for exact counts.
class SpfAdvisor
  # Each provider's top-level SPF include. nil = provider doesn't need an
  # SPF record (Postmark uses MAIL FROM rewriting via a CNAME instead).
  PROVIDER_INCLUDES = {
    "resend"   => "amazonses.com",  # Resend sends through AWS SES infra
    "aws_ses"  => "amazonses.com",
    "sendgrid" => "sendgrid.net",
    "mailgun"  => "mailgun.org",
    "postmark" => nil,
    "brevo"    => "spf.brevo.com",
    "smtp"     => nil
  }.freeze

  # Conservative estimate of how many DNS lookups each include actually
  # consumes once the SPF record's `include:` chain is fully resolved.
  # The values include the top-level lookup itself (so amazonses.com
  # contributing "2" means 1 top-level + ~1 nested).
  ESTIMATED_NESTED_LOOKUPS = {
    "amazonses.com"  => 2,
    "sendgrid.net"   => 3,
    "mailgun.org"    => 2,
    "spf.brevo.com"  => 2
  }.freeze

  WARN_AT = 8
  CAP     = 10

  Result = Struct.new(
    :spf_record, :lookup_count, :level, :message, :includes,
    keyword_init: true
  ) do
    def to_h
      { spf_record: spf_record, lookup_count: lookup_count,
        level: level, message: message, includes: includes }
    end
  end

  # `providers` may be an array of provider name strings, ProviderConnection
  # records, or DomainProviderVerification records. We dedupe by provider name
  # since multiple connections of the same provider type share an SPF include.
  def self.call(providers)
    keys = Array(providers).map { |p| extract_provider(p) }.compact.uniq

    includes = keys
                 .map { |k| PROVIDER_INCLUDES[k] }
                 .compact
                 .uniq

    spf_record =
      if includes.empty?
        nil
      else
        "v=spf1 " + includes.map { |i| "include:#{i}" }.join(" ") + " ~all"
      end

    lookup_count = includes.sum { |inc| ESTIMATED_NESTED_LOOKUPS[inc] || 1 }

    level, message = level_for(lookup_count)

    Result.new(
      spf_record:   spf_record,
      lookup_count: lookup_count,
      level:        level,
      message:      message,
      includes:     includes
    )
  end

  def self.extract_provider(p)
    return p.to_s if p.is_a?(String) || p.is_a?(Symbol)
    return p.provider if p.respond_to?(:provider)
    nil
  end
  private_class_method :extract_provider

  def self.level_for(count)
    case count
    when 0..(WARN_AT - 1)
      ["ok", nil]
    when WARN_AT..(CAP - 1)
      ["warning",
       "SPF is approaching the 10-lookup limit (~#{count}). " \
       "Adding more providers here will start breaking SPF authentication. " \
       "Consider SPF flattening or splitting providers across subdomains."]
    else
      ["danger",
       "SPF is over the 10-lookup limit (~#{count}). " \
       "Receivers will return PermError and treat your messages as unauthenticated. " \
       "Flatten the record or move providers to a different subdomain."]
    end
  end
  private_class_method :level_for
end
