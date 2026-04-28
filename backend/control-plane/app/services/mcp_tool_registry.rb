# frozen_string_literal: true

# Registry of MCP tools exposed by the CourierX server.
#
# Each entry declares:
#   - :name        — wire name (matches `tools/call` arg)
#   - :permission  — string from McpConnection::PERMISSIONS that gates access
#   - :title       — human label
#   - :description — what the tool does, shown to the agent
#   - :input_schema — JSON Schema for arguments
#   - :handler     — class responding to `.call(arguments:, context:)` returning a Result
#
# A `full_access` connection bypasses the permission check on every tool.
module McpToolRegistry
  module_function

  def all
    TOOLS
  end

  def find(name)
    TOOLS.find { |t| t[:name] == name }
  end

  # JSON-RPC `tools/list` shape — keys must be camelCase per the MCP spec.
  def descriptors
    TOOLS.map do |t|
      {
        name:        t[:name],
        title:       t[:title],
        description: t[:description],
        inputSchema: t[:input_schema]
      }
    end
  end

  TOOLS = [
    {
      name:        "send_email",
      permission:  "send_email",
      title:       "Send email",
      description: "Send a transactional email through CourierX. Honors tenant routing rules, BYOK provider connections, and suppression list.",
      input_schema: {
        type: "object",
        required: %w[to from subject],
        properties: {
          to:       { type: "string", format: "email", description: "Recipient email" },
          to_name:  { type: "string" },
          from:     { type: "string", format: "email", description: "Sender email — must be on a verified domain" },
          from_name: { type: "string" },
          reply_to: { type: "string", format: "email" },
          subject:  { type: "string" },
          html:     { type: "string", description: "HTML body" },
          text:     { type: "string", description: "Plain-text body" },
          template_id: { type: "string", description: "Use a saved template instead of html/text" },
          variables: { type: "object", description: "Template variables" },
          tags:     { type: "array", items: { type: "string" } },
          metadata: { type: "object" }
        }
      },
      handler: "McpTools::SendEmail"
    },
    {
      name:        "list_emails",
      permission:  "read_only",
      title:       "List emails",
      description: "List recent emails for the tenant. Filter by status (queued, sent, delivered, bounced, complained, failed, suppressed) or recipient substring.",
      input_schema: {
        type: "object",
        properties: {
          status:    { type: "string", enum: Email::STATUSES },
          recipient: { type: "string" },
          limit:     { type: "integer", minimum: 1, maximum: 100, default: 25 }
        }
      },
      handler: "McpTools::ListEmails"
    },
    {
      name:        "get_email",
      permission:  "read_only",
      title:       "Get email detail",
      description: "Fetch a single email with full event log.",
      input_schema: {
        type: "object",
        required: %w[id],
        properties: { id: { type: "string", description: "Email UUID" } }
      },
      handler: "McpTools::GetEmail"
    },
    {
      name:        "list_domains",
      permission:  "read_only",
      title:       "List sending domains",
      description: "List the tenant's sending domains and their verification status.",
      input_schema: { type: "object", properties: {} },
      handler:     "McpTools::ListDomains"
    },
    {
      name:        "list_provider_connections",
      permission:  "read_only",
      title:       "List provider connections",
      description: "List connected email providers for the tenant. Credentials are never returned.",
      input_schema: { type: "object", properties: {} },
      handler:     "McpTools::ListProviderConnections"
    },
    {
      name:        "list_routing_rules",
      permission:  "read_only",
      title:       "List routing rules",
      description: "List the tenant's provider routing rules.",
      input_schema: { type: "object", properties: {} },
      handler:     "McpTools::ListRoutingRules"
    },
    {
      name:        "list_suppressions",
      permission:  "read_only",
      title:       "List suppressed addresses",
      description: "List recipient addresses currently on the suppression list.",
      input_schema: {
        type: "object",
        properties: {
          reason: { type: "string", enum: Suppression::REASONS },
          limit:  { type: "integer", minimum: 1, maximum: 100, default: 50 }
        }
      },
      handler: "McpTools::ListSuppressions"
    },
    {
      name:        "add_suppression",
      permission:  "manage_suppressions",
      title:       "Add suppression",
      description: "Add an email address to the suppression list. Future sends to this address will be blocked.",
      input_schema: {
        type: "object",
        required: %w[email],
        properties: {
          email:  { type: "string", format: "email" },
          reason: { type: "string", enum: Suppression::REASONS, default: "manual" }
        }
      },
      handler: "McpTools::AddSuppression"
    },
    {
      name:        "remove_suppression",
      permission:  "manage_suppressions",
      title:       "Remove suppression",
      description: "Remove an email address from the suppression list.",
      input_schema: {
        type: "object",
        required: %w[email],
        properties: { email: { type: "string", format: "email" } }
      },
      handler: "McpTools::RemoveSuppression"
    },
    {
      name:        "list_templates",
      permission:  "read_only",
      title:       "List email templates",
      description: "List the tenant's saved email templates.",
      input_schema: {
        type: "object",
        properties: { status: { type: "string", enum: EmailTemplate::STATUSES } }
      },
      handler: "McpTools::ListTemplates"
    },
    {
      name:        "render_template_preview",
      permission:  "read_only",
      title:       "Preview a template",
      description: "Render a template with given variables and return the resulting subject + bodies.",
      input_schema: {
        type: "object",
        required: %w[template_id],
        properties: {
          template_id: { type: "string" },
          variables:   { type: "object" }
        }
      },
      handler: "McpTools::RenderTemplatePreview"
    }
  ].freeze
end
