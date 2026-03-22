class AddRoutingAttemptsToEmails < ActiveRecord::Migration[8.1]
  def change
    add_column :emails, :routing_attempts, :jsonb
  end
end
