class CreateDomains < ActiveRecord::Migration[7.1]
  def change
    create_table :domains, id: :uuid do |t|
      t.references :tenant,    null: false, foreign_key: true, type: :uuid
      t.string     :domain,    null: false
      t.string     :status,    null: false, default: "pending"
      t.string     :spf_record
      t.string     :dkim_selector
      t.string     :dkim_public_key
      t.string     :dmarc_policy
      t.string     :verification_token
      t.datetime   :verified_at

      t.timestamps
    end

    add_index :domains, [:tenant_id, :domain], unique: true
    add_index :domains, :domain
    add_index :domains, :verification_token, unique: true, where: "verification_token IS NOT NULL"
  end
end
