# db/seeds.rb
#
# Seeds a demo tenant with realistic data for development.

puts "Seeding CourierX development data..."

# ── Demo Tenant ──
# Use existing "Test Workspace" tenant if present, otherwise create Acme Corp
tenant = Tenant.find_or_create_by!(email: "test@courierx.dev") do |t|
  t.name     = "Test Workspace"
  t.slug     = "test-workspace"
  t.password = "password123"
  t.mode     = "demo"
end
puts "  Tenant: #{tenant.name} (#{tenant.email})"

# ── Rate Limit Policy ──
tenant.create_rate_limit_policy!(
  max_per_minute: 60,
  max_per_hour: 1_000,
  max_per_day: 10_000,
  max_per_month: 100_000,
  demo_restricted: true,
  demo_max_total: 1_000
) unless tenant.rate_limit_policy
puts "  Rate limit policy"

# ── Provider Connections ──
providers_data = [
  { provider: "sendgrid",  display_name: "SendGrid Primary",  priority: 1, success_rate: 99.2, avg_latency_ms: 145 },
  { provider: "aws_ses",   display_name: "Amazon SES",        priority: 2, success_rate: 98.7, avg_latency_ms: 210 },
  { provider: "mailgun",   display_name: "Mailgun Fallback",  priority: 3, success_rate: 97.4, avg_latency_ms: 185 },
]

providers_data.each do |attrs|
  ProviderConnection.find_or_create_by!(tenant: tenant, provider: attrs[:provider], mode: "managed") do |pc|
    pc.display_name    = attrs[:display_name]
    pc.status          = "active"
    pc.weight          = 100
    pc.priority        = attrs[:priority]
    pc.success_rate    = attrs[:success_rate]
    pc.avg_latency_ms  = attrs[:avg_latency_ms]
    pc.last_health_check_at = Time.current
  end
end
puts "  #{providers_data.size} provider connections"

# ── Domain ──
domain = Domain.find_or_create_by!(tenant: tenant, domain: "mail.acme-corp.dev") do |d|
  d.status       = "verified"
  d.verified_at  = Time.current
  d.spf_record   = "v=spf1 include:courierx.io ~all"
  d.dkim_selector = "cx1"
end
puts "  Domain: #{domain.domain}"

# ── Default Routing Rule ──
rule = RoutingRule.find_or_create_by!(tenant: tenant, is_default: true) do |r|
  r.name     = "Default priority"
  r.strategy = "priority"
end
puts "  Routing rule: #{rule.name}"

# ── API Key ──
raw_key = "cxk_live_#{SecureRandom.hex(32)}"
api_key = ApiKey.find_or_create_by!(tenant: tenant, name: "Development key") do |k|
  k.key_hash   = Digest::SHA256.hexdigest(raw_key)
  k.key_prefix = raw_key[0..15]
  k.scopes     = ["email:send", "suppression:read", "suppression:write"]
end
puts "  API Key: #{api_key.key_prefix}..."

# ── Webhook Endpoint ──
WebhookEndpoint.find_or_create_by!(tenant: tenant, url: "https://webhook.site/acme-corp") do |w|
  w.events = ["delivered", "bounced", "complained", "opened", "clicked"]
  w.is_active = true
  w.secret = SecureRandom.hex(24)
end
puts "  Webhook endpoint"

# ── Usage Stats (90 days of realistic data) — bulk insert ──
puts "  Generating 90 days of usage stats..."
now = Time.current
usage_rows = 90.downto(0).map do |days_ago|
  date      = days_ago.days.ago.to_date
  base_sent = (800 + (90 - days_ago) * 15 + rand(-80..80)).clamp(500, 2500)
  base_sent = (base_sent * 0.4).to_i if date.saturday? || date.sunday?
  delivered  = (base_sent * rand(0.965..0.985)).to_i
  bounced    = (base_sent * rand(0.002..0.008)).to_i
  complained = (base_sent * rand(0.0001..0.001)).to_i
  failed     = [base_sent - delivered - bounced - complained, 0].max
  opened     = (delivered * rand(0.32..0.45)).to_i
  clicked    = (opened * rand(0.15..0.28)).to_i
  {
    id: SecureRandom.uuid, tenant_id: tenant.id, date: date, provider: nil,
    emails_sent: base_sent, emails_delivered: delivered, emails_bounced: bounced,
    emails_complained: complained, emails_failed: failed,
    emails_opened: opened, emails_clicked: clicked,
    created_at: now, updated_at: now
  }
end
UsageStat.upsert_all(usage_rows, unique_by: :idx_usage_stats_tenant_date_provider)
puts "  #{usage_rows.size} usage stat records"

# ── Sample Emails (recent activity) — bulk insert ──
puts "  Generating sample emails..."
subjects = [
  { subject: "May product update",         tag: "product-update" },
  { subject: "Welcome to Acme Corp",       tag: "welcome" },
  { subject: "Your weekly digest",         tag: "digest" },
  { subject: "Q2 newsletter",             tag: "newsletter" },
  { subject: "Onboarding day 7",          tag: "onboarding" },
  { subject: "Feature: AI editor",        tag: "feature-announce" },
  { subject: "Password reset request",    tag: "transactional" },
  { subject: "Invoice #1042",            tag: "transactional" },
  { subject: "Your trial is ending soon", tag: "lifecycle" },
  { subject: "New login from Chrome",     tag: "security" },
]
statuses   = %w[delivered delivered delivered delivered delivered delivered bounced sent queued failed]
recipients = (1..50).map { |i| "user#{i}@example.com" }
providers  = tenant.provider_connections.pluck(:id)

email_rows  = []
event_rows  = []

60.downto(0) do |days_ago|
  count = days_ago < 7 ? rand(8..15) : rand(3..8)
  count.times do
    template    = subjects.sample
    status      = statuses.sample
    created     = days_ago.days.ago + rand(0..86400).seconds
    sent_at     = %w[sent delivered bounced].include?(status) ? created + rand(1..5).seconds : nil
    delivered_at = status == "delivered" ? sent_at + rand(5..30).seconds : nil
    email_id    = SecureRandom.uuid

    email_rows << {
      id: email_id, tenant_id: tenant.id,
      from_email: "updates@mail.acme-corp.dev", to_email: recipients.sample,
      subject: template[:subject], html_body: "<p>Hello from Acme Corp</p>",
      text_body: "Hello from Acme Corp", status: status,
      tags: [template[:tag]], metadata: {}, queued_at: created,
      sent_at: sent_at, delivered_at: delivered_at,
      provider_connection_id: providers.sample, domain_id: domain.id,
      attempt_count: status == "failed" ? 3 : 1,
      last_error: status == "failed" ? "Connection timeout after 3 attempts" : nil,
      created_at: created, updated_at: created
    }

    primary_provider = providers.any? ? tenant.provider_connections.first.provider : "sendgrid"
    if status == "delivered"
      event_rows << { id: SecureRandom.uuid, email_id: email_id,
                      event_type: "delivered", occurred_at: delivered_at,
                      provider: primary_provider, raw_payload: {}, created_at: now, updated_at: now }
      if rand < 0.4
        event_rows << { id: SecureRandom.uuid, email_id: email_id,
                        event_type: "opened", occurred_at: delivered_at + rand(60..7200).seconds,
                        provider: "webhook", raw_payload: {},
                        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                        created_at: now, updated_at: now }
      end
      if rand < 0.12
        event_rows << { id: SecureRandom.uuid, email_id: email_id,
                        event_type: "clicked", occurred_at: delivered_at + rand(120..14400).seconds,
                        provider: "webhook", raw_payload: {},
                        link_url: ["https://acme-corp.dev/changelog", "https://acme-corp.dev/trial", "https://acme-corp.dev/docs"].sample,
                        created_at: now, updated_at: now }
      end
    elsif status == "bounced"
      event_rows << { id: SecureRandom.uuid, email_id: email_id,
                      event_type: "bounced", occurred_at: sent_at || created + 2.seconds,
                      provider: primary_provider, raw_payload: {},
                      bounce_type: ["permanent", "temporary"].sample,
                      bounce_code: ["550", "421", "452"].sample,
                      bounce_message: "Mailbox not found",
                      created_at: now, updated_at: now }
    end
  end
end

Email.insert_all(email_rows)
if event_rows.any?
  event_keys = %i[id email_id event_type occurred_at provider raw_payload
                  user_agent link_url bounce_type bounce_code bounce_message
                  created_at updated_at]
  normalized = event_rows.map { |r| event_keys.index_with { |k| r[k] } }
  EmailEvent.insert_all(normalized)
end
puts "  #{email_rows.size} sample emails, #{event_rows.size} events"

# ── Suppressions ──
3.times do |i|
  Suppression.find_or_create_by!(tenant: tenant, email: "bounced#{i + 1}@example.com") do |s|
    s.reason = ["hard_bounce", "complaint", "manual"].sample
  end
end
puts "  3 suppressions"

# ── JWT Token for dev ──
token = JwtService.encode({ tenant_id: tenant.id })

puts ""
puts "-" * 60
puts "Development credentials"
puts "-" * 60
puts "  Login:    test@courierx.dev / password123"
puts "  API Key:  #{raw_key}"
puts "  JWT:      #{token}"
puts "  Tenant:   #{tenant.id}"
puts "-" * 60
puts ""
puts "Seeding complete!"
