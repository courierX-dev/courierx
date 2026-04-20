class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid   :tenant_id
      t.string :project_id
      t.string :to_email,        null: false
      t.string :from_email,      null: false
      t.string :subject,         null: false
      t.text   :body_html
      t.text   :body_text
      t.string :provider_used
      t.string :status,          null: false, default: "sent"
      t.string :tags,            array: true, default: []
      t.jsonb  :metadata,        default: {}
      t.string :idempotency_key
      t.bigint :duration_ms,     default: 0, null: false
      t.datetime :created_at,    null: false, default: -> { "now()" }
    end

    add_index :messages, :tenant_id
    add_index :messages, :idempotency_key, unique: true, where: "idempotency_key IS NOT NULL"
    add_index :messages, [:tenant_id, :created_at]
    add_index :messages, :provider_used
  end
end
