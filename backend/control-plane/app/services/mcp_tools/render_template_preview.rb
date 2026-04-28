# frozen_string_literal: true

module McpTools
  class RenderTemplatePreview < Base
    def call
      return error("Missing 'template_id'") if args[:template_id].blank?

      template = tenant.email_templates.find_by(id: args[:template_id])
      return error("Template not found") unless template

      rendered = template.render_preview(args[:variables] || {})
      ok("Rendered template '#{template.name}'", rendered)
    end
  end
end
