class CreateEmailEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :email_events, id: :uuid do |t|
      t.references :email, null: false, foreign_key: true, type: :uuid
      t.string   :event_type,    null: false
      t.datetime :occurred_at,   null: false
      t.string   :provider,      null: false
      t.jsonb    :raw_payload,   null: false, default: {}
      t.string   :user_agent
      t.string   :ip_address
      t.string   :link_url
      t.string   :bounce_code
      t.string   :bounce_type
      t.text     :bounce_message

      t.timestamps
    end

    add_index :email_events, [:email_id, :event_type]
    add_index :email_events, :occurred_at
    add_index :email_events, [:email_id, :occurred_at]
  end
end
