class CreateWebhookDeliveries < ActiveRecord::Migration[7.1]
  def change
    create_table :webhook_deliveries, id: :uuid do |t|
      t.references :webhook_endpoint, null: false, foreign_key: true, type: :uuid
      t.uuid       :email_event_id
      t.jsonb      :payload,          null: false, default: {}
      t.integer    :response_status
      t.text       :response_body
      t.integer    :attempt_count,    null: false, default: 1
      t.boolean    :success,          null: false, default: false
      t.datetime   :next_retry_at
      t.datetime   :delivered_at

      t.timestamps
    end

    add_index :webhook_deliveries, [:webhook_endpoint_id, :success]
    add_index :webhook_deliveries, :next_retry_at, where: "success = false AND next_retry_at IS NOT NULL"
  end
end
