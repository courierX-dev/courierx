class CreateSuppressions < ActiveRecord::Migration[7.1]
  def change
    create_table :suppressions, id: :uuid do |t|
      t.references :tenant, null: false, foreign_key: true, type: :uuid
      t.string     :email,  null: false
      t.string     :reason, null: false
      t.text       :note
      t.uuid       :source_email_id

      t.timestamps
    end

    add_index :suppressions, [:tenant_id, :email], unique: true
  end
end
