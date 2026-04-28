# frozen_string_literal: true

# Resolves an MCP `tools/call` request to the right handler, runs it, and
# writes an audit log entry. Handlers receive a Context struct and return a
# Result.
class McpToolDispatcher
  Context = Struct.new(:tenant, :connection, :ip_address, keyword_init: true)

  Result = Struct.new(:success, :text, :data, keyword_init: true) do
    def success? = success
    def self.ok(text, data = nil)   = new(success: true,  text: text, data: data)
    def self.error(text)            = new(success: false, text: text, data: nil)
  end

  def self.call(tool_name:, arguments:, tenant:, connection:, ip_address: nil)
    new(tool_name, arguments, tenant, connection, ip_address).call
  end

  def initialize(tool_name, arguments, tenant, connection, ip_address)
    @tool_name  = tool_name
    @arguments  = arguments.is_a?(Hash) ? arguments : {}
    @tenant     = tenant
    @connection = connection
    @ip_address = ip_address
  end

  def call
    started = Time.current
    tool    = McpToolRegistry.find(@tool_name)

    return audit_and_return(Result.error("Unknown tool: #{@tool_name}"), tool, started, "unknown_tool") unless tool

    unless @connection.can?(tool[:permission])
      return audit_and_return(
        Result.error("Permission denied. This connection lacks the '#{tool[:permission]}' scope."),
        tool, started, "permission_denied"
      )
    end

    handler = tool[:handler].constantize
    result  = handler.call(arguments: @arguments, context: context)
    audit_and_return(result, tool, started, nil)
  rescue => e
    Rails.logger.error("[MCP] tool #{@tool_name} failed: #{e.class}: #{e.message}")
    audit_and_return(Result.error("Tool error: #{e.message}"), tool, started, e.class.name)
  end

  private

  def context
    Context.new(tenant: @tenant, connection: @connection, ip_address: @ip_address)
  end

  def audit_and_return(result, tool, started, failure_class)
    duration_ms = ((Time.current - started) * 1000).to_i

    McpAuditLog.create!(
      mcp_connection_id: @connection.id,
      tenant_id:         @tenant.id,
      tool_name:         @tool_name.to_s,
      input_params:      sanitized_params,
      success:           result.success?,
      output_summary:    result.text.to_s.truncate(500),
      error_message:     result.success? ? nil : (failure_class || result.text.to_s.truncate(500)),
      duration_ms:       duration_ms,
      ip_address:        @ip_address
    )
    result
  rescue => e
    Rails.logger.error("[MCP] audit log write failed: #{e.class}: #{e.message}")
    result
  end

  # Strip obviously-sensitive fields before persisting to the audit log.
  SENSITIVE_KEYS = %w[html text variables metadata].freeze

  def sanitized_params
    @arguments.each_with_object({}) do |(k, v), out|
      out[k.to_s] = SENSITIVE_KEYS.include?(k.to_s) ? "[redacted]" : v
    end
  end
end
