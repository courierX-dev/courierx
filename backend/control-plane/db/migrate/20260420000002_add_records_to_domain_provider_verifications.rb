class AddRecordsToDomainProviderVerifications < ActiveRecord::Migration[8.1]
  def change
    change_table :domain_provider_verifications do |t|
      t.jsonb    :records,          default: [], null: false
      t.datetime :last_checked_at
      t.string   :error
    end

    add_index :domain_provider_verifications, :status
  end
end
