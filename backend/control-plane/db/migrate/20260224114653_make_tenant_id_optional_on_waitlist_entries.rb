class MakeTenantIdOptionalOnWaitlistEntries < ActiveRecord::Migration[8.1]
  def change
    change_column_null :waitlist_entries, :tenant_id, true
  end
end

