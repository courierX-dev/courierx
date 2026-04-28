# frozen_string_literal: true

module McpTools
  class ListProviderConnections < Base
    def call
      records = tenant.provider_connections.order(:priority).map do |pc|
        {
          id:           pc.id,
          provider:     pc.provider,
          display_name: pc.display_name,
          status:       pc.status,
          mode:         pc.mode,
          priority:     pc.priority,
          weight:       pc.weight,
          healthy:      pc.healthy?
        }
      end
      ok("#{records.size} provider connection(s)", { provider_connections: records })
    end
  end
end
