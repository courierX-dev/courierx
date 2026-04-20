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
# Usage:
#   DomainProviderPropagationService.call(domain)
#
# Returns an array of DomainProviderVerification records.
#
class DomainProviderPropagationService
  def self.call(domain)
    new(domain).call
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
    dpv = @domain.domain_provider_verifications.find_or_initialize_by(provider: connection.provider)
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
