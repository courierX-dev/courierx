# frozen_string_literal: true

# ProviderConnectionPropagationJob
#
# When a tenant adds a NEW provider connection, this job backfills DPV rows
# for every domain they already own — calling the provider's API to register
# the domain and persist the returned DNS records. Without this, an existing
# domain wouldn't pick up the new provider's records until the tenant
# manually re-saved the domain.
#
# Pairs with DomainPropagationJob (which handles the inverse: new domain →
# every existing connection).
class ProviderConnectionPropagationJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(connection_id)
    connection = ProviderConnection.find_by(id: connection_id)
    return unless connection
    return unless connection.status == "active"

    DomainProviderPropagationService.propagate_for_connection(connection)

    # Kick off a poll cycle for each domain that now has new pending DPVs.
    connection.tenant.domains.find_each do |domain|
      DomainProviderPollJob.perform_in(1.minute, domain.id)
    end
  end
end
