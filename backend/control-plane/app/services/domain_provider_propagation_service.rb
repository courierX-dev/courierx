# frozen_string_literal: true

# DomainProviderPropagationService
#
# When a tenant adds a domain, this service registers that domain with every
# active provider connection the tenant has configured. Each provider's API
# returns the DNS records that provider wants published — we persist those
# records on the DomainProviderVerification row so the tenant can see a
# unified list of DNS entries to add.
#
# The tenant's experience: add one domain, get one page of DNS records that
# satisfies every provider they use — instead of doing this setup five
# separate times in five different dashboards.
#
# Two entry points:
#   call(domain)                        — fan one domain out to every connection
#   propagate_for_connection(conn)      — fan one connection out to every domain
#                                         (used when a tenant adds a NEW provider
#                                          and we need to backfill DPVs for the
#                                          domains they already own)
#
class DomainProviderPropagationService
  def self.call(domain)
    new(domain).call
  end

  def self.propagate_for_connection(connection)
    connection.tenant.domains.map do |domain|
      new(domain).send(:propagate_to, connection)
    end
  end

  def initialize(domain)
    @domain = domain
    @tenant = domain.tenant
  end

  def call
    connections = @tenant.provider_connections.where(status: "active")
    connections.map { |conn| propagate_to(conn) }
  end

  private

  def propagate_to(connection)
    # Multi-account: a tenant can have several Resend connections. DPV is keyed
    # on the specific connection, not the provider type, so each Resend account
    # gets its own DPV row even when the domain is the same.
    dpv = @domain.domain_provider_verifications
                 .find_or_initialize_by(provider_connection: connection)
    dpv.status = "pending" if dpv.new_record?

    result = adapter_for(connection).register(@domain, connection)

    if result[:success]
      dpv.assign_attributes(
        records:            result[:records] || [],
        external_domain_id: result[:external_domain_id],
        status:             "pending",
        error:              nil
      )
    else
      dpv.assign_attributes(status: "failed", error: result[:error])
    end

    dpv.save!
    dpv
  end

  def adapter_for(connection)
    case connection.provider
    when "sendgrid" then DomainAdapters::Sendgrid.new
    when "resend"   then DomainAdapters::Resend.new
    when "mailgun"  then DomainAdapters::Mailgun.new
    when "aws_ses"  then DomainAdapters::Ses.new
    when "postmark" then DomainAdapters::Postmark.new
    else                 DomainAdapters::NullAdapter.new
    end
  end
end
