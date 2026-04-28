# frozen_string_literal: true

module McpTools
  class ListSuppressions < Base
    def call
      scope = tenant.suppressions.order(created_at: :desc)
      scope = scope.where(reason: args[:reason]) if args[:reason].present?

      limit = args[:limit].to_i
      limit = 50 if limit <= 0
      limit = [limit, 100].min

      records = scope.limit(limit).map do |s|
        { email: s.email, reason: s.reason, created_at: s.created_at }
      end
      ok("#{records.size} suppression(s)", { suppressions: records })
    end
  end
end
