class CreateMcpConnections < ActiveRecord::Migration[7.1]
  def change
    create_table :mcp_connections, id: :uuid do |t|
      t.references :tenant,    null: false, foreign_key: true, type: :uuid
      t.string     :name,      null: false
      t.text       :description
      t.string     :client_id,           null: false
      t.string     :client_secret_hash,  null: false
      t.string     :status,    null: false, default: "connected"
      t.string     :permissions, array: true, default: ["send_email"]
      t.string     :allowed_from_emails, array: true, default: []
      t.string     :allowed_tags,        array: true, default: []
      t.integer    :max_emails_per_run
      t.boolean    :require_approval,    null: false, default: false
      t.datetime   :last_connected_at
      t.datetime   :last_used_at
      t.integer    :total_emails_sent,   null: false, default: 0

      t.timestamps
    end

    add_index :mcp_connections, :client_id,  unique: true
  end
end
