class CreateMcpAuditLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :mcp_audit_logs, id: :uuid do |t|
      t.uuid     :mcp_connection_id, null: false
      t.uuid     :tenant_id,         null: false
      t.string   :tool_name,         null: false
      t.jsonb    :input_params,      null: false, default: {}
      t.text     :output_summary
      t.boolean  :success,           null: false, default: false
      t.text     :error_message
      t.string   :ip_address
      t.integer  :duration_ms
      t.uuid     :email_id

      t.datetime :created_at, null: false, default: -> { "NOW()" }
    end

    # No foreign keys — audit survives deletions
    add_index :mcp_audit_logs, [:mcp_connection_id, :created_at]
    add_index :mcp_audit_logs, [:tenant_id, :created_at]
  end
end
