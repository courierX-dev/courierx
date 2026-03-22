# db/seeds.rb
#
# Seeds a demo tenant with sample data for development/testing.

puts "🌱 Seeding CourierX development data..."

# ── Demo Tenant ──
tenant = Tenant.find_or_create_by!(slug: "acme-corp") do |t|
  t.name     = "Acme Corp"
  t.email    = "admin@acme-corp.dev"
  t.password = "password123"
  t.mode     = "demo"
end
puts "  ✓ Tenant: #{tenant.name} (#{tenant.id})"

# ── Rate Limit Policy ──
tenant.create_rate_limit_policy!(
  max_per_minute: 60,
  max_per_hour: 1_000,
  max_per_day: 10_000,
  max_per_month: 100_000,
  demo_restricted: true,
  demo_max_total: 1_000
) unless tenant.rate_limit_policy
puts "  ✓ Rate limit policy"

# ── Provider Connections (managed demo) ──
providers = [
  { provider: "sendgrid",  display_name: "SendGrid (Demo)" },
  { provider: "aws_ses",   display_name: "Amazon SES (Demo)" },
  { provider: "mailgun",   display_name: "Mailgun (Demo)" },
]

providers.each do |attrs|
  ProviderConnection.find_or_create_by!(tenant: tenant, provider: attrs[:provider], mode: "managed") do |pc|
    pc.display_name = attrs[:display_name]
    pc.status       = "active"
    pc.weight       = 100
    pc.priority     = 1
    pc.success_rate = rand(98.0..99.9).round(2)
    pc.avg_latency_ms = rand(50..200)
  end
end
puts "  ✓ #{providers.size} provider connections"

# ── Domain ──
domain = Domain.find_or_create_by!(tenant: tenant, domain: "mail.acme-corp.dev") do |d|
  d.status = "verified"
  d.verified_at = Time.current
  d.spf_record = "v=spf1 include:courierx.io ~all"
  d.dkim_selector = "cx1"
end
puts "  ✓ Domain: #{domain.domain}"

# ── Default Routing Rule ──
rule = RoutingRule.find_or_create_by!(tenant: tenant, is_default: true) do |r|
  r.name     = "Default Priority"
  r.strategy = "priority"
end
puts "  ✓ Routing rule: #{rule.name}"

# ── API Key ──
raw_key = "cxk_live_#{SecureRandom.hex(32)}"
api_key = ApiKey.find_or_create_by!(tenant: tenant, name: "Development Key") do |k|
  k.key_hash   = Digest::SHA256.hexdigest(raw_key)
  k.key_prefix = raw_key[0..15]
  k.scopes     = ["email:send", "suppression:read", "suppression:write"]
end
puts "  ✓ API Key: #{api_key.key_prefix}... (full key in console output below)"

# ── JWT Token ──
token = JwtService.encode({ tenant_id: tenant.id })

puts ""
puts "─" * 60
puts "📋 Development Credentials"
puts "─" * 60
puts "  API Key:   #{raw_key}"
puts "  JWT Token: #{token}"
puts "  Tenant ID: #{tenant.id}"
puts "─" * 60
puts ""
puts "🎉 Seeding complete!"
