class CreateOutboxEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :outbox_events, id: :uuid do |t|
      t.string   :event_type,    null: false
      t.jsonb    :payload,       null: false, default: {}
      t.string   :status,        null: false, default: "pending"
      t.integer  :attempt_count, null: false, default: 0
      t.integer  :max_attempts,  null: false, default: 5
      t.datetime :process_after
      t.datetime :processed_at
      t.text     :last_error

      t.timestamps
    end

    add_index :outbox_events, [:status, :process_after], name: "idx_outbox_pickup"
    add_index :outbox_events, :created_at
  end
end
