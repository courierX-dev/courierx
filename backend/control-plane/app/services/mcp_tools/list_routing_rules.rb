# frozen_string_literal: true

module McpTools
  class ListRoutingRules < Base
    def call
      records = tenant.routing_rules.includes(:provider_connections).order(created_at: :desc).map do |r|
        {
          id:         r.id,
          name:       r.name,
          strategy:   r.strategy,
          is_default: r.is_default,
          is_active:  r.is_active,
          providers:  r.provider_connections.map { |pc| { id: pc.id, provider: pc.provider, display_name: pc.display_name } }
        }
      end
      ok("#{records.size} routing rule(s)", { routing_rules: records })
    end
  end
end
