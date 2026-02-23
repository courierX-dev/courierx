class McpAuditLog < ApplicationRecord
  # Append-only — no FK constraints by design.
  # Survives even if the MCP connection is deleted.

  validates :mcp_connection_id, presence: true
  validates :tenant_id,         presence: true
  validates :tool_name,         presence: true

  scope :for_connection, ->(id) { where(mcp_connection_id: id).order(created_at: :desc) }
  scope :for_tenant,     ->(id) { where(tenant_id: id).order(created_at: :desc) }
  scope :successful,     -> { where(success: true) }
  scope :failed,         -> { where(success: false) }
end
