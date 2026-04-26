# frozen_string_literal: true

# EligibleConnectionsResolver
#
# Single source of truth for "given a tenant + from_email, which provider
# connections are eligible to send this message, and in what order?"
#
# Called from two places:
#   - EmailDispatchService — pre-flight: empty result rejects the send
#   - OutboxProcessorJob   — at dispatch: result becomes the providers[]
#                            array sent to the Go engine for failover
#
# Both callers re-resolve (rather than freezing the answer at queue time)
# so cap usage and provider health are always current at send time.
#
# Eligibility filters (applied in order):
#   1. Tenant owns the from_email's domain (Domain.status = "verified")
#   2. Connection has DomainProviderVerification.status = "verified" for it
#   3. Connection.status in (active, degraded) — banned/inactive are out
#   4. ProviderQuota allows headroom (no quota row = treated as unlimited)
#
# Ordering — first matching wins:
#   1. RoutingRule with match_tag in the email's tags
#   2. RoutingRule with match_from_domain == from_domain
#   3. RoutingRule with is_default = true
#   4. Fallback: all active connections sorted by their `priority` field
#
# Return shape:
#   { eligible: [ProviderConnection, ...], reason: nil, domain: Domain }
#   { eligible: [], reason: <symbol>, domain: nil, **extras }
class EligibleConnectionsResolver
  HEALTHY_STATUSES = %w[active degraded].freeze

  Result = Struct.new(:eligible, :reason, :domain, :extras, keyword_init: true) do
    def empty?         = eligible.empty?
    def [](key)        = (key == :extras ? extras : send(key))
  end

  def self.call(tenant:, from_email:, tags: [])
    new(tenant, from_email, tags).call
  end

  def initialize(tenant, from_email, tags)
    @tenant      = tenant
    @from_email  = from_email.to_s.downcase
    @from_domain = @from_email.split("@").last
    @tags        = Array(tags)
  end

  def call
    return reject(:invalid_from_email) if @from_domain.blank?

    domain = @tenant.domains
                    .where("LOWER(domain) = ?", @from_domain)
                    .where(status: "verified")
                    .first
    return reject(:unverified_domain) unless domain

    candidate_ids = candidate_connection_ids
    return reject(:no_verified_provider) if candidate_ids.empty?

    verified_ids = DomainProviderVerification
                     .where(domain_id: domain.id,
                            status: "verified",
                            provider_connection_id: candidate_ids)
                     .pluck(:provider_connection_id)
                     .to_set
    return reject(:no_verified_provider) if verified_ids.empty?

    healthy_by_id = ProviderConnection
                      .where(id: verified_ids.to_a, status: HEALTHY_STATUSES)
                      .includes(:provider_quota)
                      .index_by(&:id)
    return reject(:all_unhealthy) if healthy_by_id.empty?

    ordered = candidate_ids.filter_map { |id| healthy_by_id[id] }

    with_cap, over_cap = ordered.partition do |conn|
      conn.provider_quota.nil? || conn.provider_quota.has_headroom?
    end

    if with_cap.empty?
      return reject(:all_over_cap, candidates_over_cap: over_cap)
    end

    Result.new(eligible: with_cap, reason: nil, domain: domain, extras: {})
  end

  private

  def reject(reason, **extras)
    Result.new(eligible: [], reason: reason, domain: nil, extras: extras)
  end

  # Returns connection ids in dispatch order based on the matched routing rule.
  # Falls back to all active connections by priority when:
  #   - no routing rule matches, OR
  #   - the matched rule exists but has NO routing_rule_providers attached.
  #     A half-configured rule (default rule auto-created on signup but never
  #     populated) shouldn't lock the tenant out of sending — it should defer
  #     to "all my connections" instead. Surprised us in prod 2026-04-26.
  def candidate_connection_ids
    rule = matched_routing_rule
    rule_ids = rule ? rule.routing_rule_providers.order(:priority).pluck(:provider_connection_id) : []

    return rule_ids if rule_ids.any?

    @tenant.provider_connections
           .where(status: HEALTHY_STATUSES)
           .order(:priority)
           .pluck(:id)
  end

  def matched_routing_rule
    rules = @tenant.routing_rules.active

    if @tags.any?
      tagged = rules.where(match_tag: @tags).first
      return tagged if tagged
    end

    rules.where(match_from_domain: @from_domain).first ||
      rules.where(is_default: true).first
  end
end
