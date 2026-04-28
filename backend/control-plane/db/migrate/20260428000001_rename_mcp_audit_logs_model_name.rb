class RenameMcpAuditLogsModelName < ActiveRecord::Migration[8.1]
  # `model_name` is a reserved class method on ActiveRecord::Base, so defining
  # it as an attribute raises DangerousAttributeError. Rename to ai_model_name
  # and drop the ignored_columns workaround in the model.
  def change
    rename_column :mcp_audit_logs, :model_name, :ai_model_name
  end
end
