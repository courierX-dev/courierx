class CreateDomainProviderVerifications < ActiveRecord::Migration[7.1]
  def change
    create_table :domain_provider_verifications, id: :uuid do |t|
      t.references :domain,   null: false, foreign_key: true, type: :uuid
      t.string     :provider, null: false
      t.string     :status,   null: false, default: "pending"
      t.string     :external_domain_id
      t.datetime   :verified_at

      t.timestamps
    end

    add_index :domain_provider_verifications, [:domain_id, :provider], unique: true
  end
end
