class AddMcpConnectionFkToEmails < ActiveRecord::Migration[7.1]
  def change
    add_foreign_key :emails, :mcp_connections, column: :mcp_connection_id
    add_index :emails, :mcp_connection_id
  end
end
