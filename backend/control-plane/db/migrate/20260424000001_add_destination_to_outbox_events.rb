class AddDestinationToOutboxEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :outbox_events, :destination, :string, null: false, default: "go_core"
    add_index  :outbox_events, [:destination, :status, :process_after],
               name: "index_outbox_events_on_destination_status_and_process_after"
  end
end
