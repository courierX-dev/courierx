# frozen_string_literal: true

module McpTools
  class ListTemplates < Base
    def call
      scope = tenant.email_templates.recent
      scope = scope.where(status: args[:status]) if args[:status].present?

      records = scope.limit(100).map do |t|
        {
          id:         t.id,
          name:       t.name,
          status:     t.status,
          category:   t.category,
          subject:    t.subject,
          updated_at: t.updated_at
        }
      end
      ok("#{records.size} template(s)", { templates: records })
    end
  end
end
