class AddTenantToWaitlistEntries < ActiveRecord::Migration[8.1]
  def change
    add_reference :waitlist_entries, :tenant, null: false, foreign_key: true, type: :uuid
  end
end
