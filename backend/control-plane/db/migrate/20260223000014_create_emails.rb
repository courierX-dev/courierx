class CreateEmails < ActiveRecord::Migration[7.1]
  def change
    create_table :emails, id: :uuid do |t|
      t.references :tenant,              null: false, foreign_key: true, type: :uuid
      t.references :provider_connection, foreign_key: true, type: :uuid
      t.references :domain,              foreign_key: true, type: :uuid
      t.uuid       :mcp_connection_id

      t.string   :from_email,  null: false
      t.string   :from_name
      t.string   :to_email,    null: false
      t.string   :to_name
      t.string   :reply_to
      t.string   :subject,     null: false
      t.text     :html_body
      t.text     :text_body
      t.string   :tags,        array: true, default: []
      t.jsonb    :metadata,    null: false, default: {}
      t.string   :status,              null: false, default: "queued"
      t.string   :provider_message_id
      t.integer  :attempt_count,       null: false, default: 0
      t.text     :last_error
      t.uuid     :outbox_event_id
      t.datetime :queued_at,    null: false, default: -> { "NOW()" }
      t.datetime :sent_at
      t.datetime :delivered_at

      t.timestamps
    end

    add_index :emails, [:tenant_id, :status]
    add_index :emails, [:tenant_id, :created_at]
    add_index :emails, :to_email
    add_index :emails, :provider_message_id, where: "provider_message_id IS NOT NULL"
    add_index :emails, :outbox_event_id,     where: "outbox_event_id IS NOT NULL"
  end
end
