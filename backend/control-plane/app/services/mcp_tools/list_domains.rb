# frozen_string_literal: true

module McpTools
  class ListDomains < Base
    def call
      records = tenant.domains.order(created_at: :desc).map do |d|
        {
          id:          d.id,
          domain:      d.domain,
          status:      d.status,
          verified_at: d.verified_at,
          created_at:  d.created_at
        }
      end
      ok("#{records.size} domain(s)", { domains: records })
    end
  end
end
