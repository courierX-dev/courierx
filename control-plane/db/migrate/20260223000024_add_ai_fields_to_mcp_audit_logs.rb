class AddAiFieldsToMcpAuditLogs < ActiveRecord::Migration[7.1]
  def change
    add_column :mcp_audit_logs, :model_name, :string
    add_column :mcp_audit_logs, :prompt_hash, :string
    add_column :mcp_audit_logs, :confidence_score, :float
    add_column :mcp_audit_logs, :human_approved, :boolean
  end
end
