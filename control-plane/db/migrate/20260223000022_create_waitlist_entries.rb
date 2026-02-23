class CreateWaitlistEntries < ActiveRecord::Migration[7.1]
  def change
    create_table :waitlist_entries, id: :uuid do |t|
      t.string   :email,         null: false
      t.string   :name
      t.string   :company
      t.string   :use_case
      t.string   :referral_code, null: false
      t.string   :referred_by
      t.integer  :position,      null: false
      t.string   :status,        null: false, default: "pending"
      t.datetime :invited_at

      t.timestamps
    end

    add_index :waitlist_entries, :email, unique: true
    add_index :waitlist_entries, :referral_code, unique: true
    add_index :waitlist_entries, :position, unique: true
    add_index :waitlist_entries, :status
    add_index :waitlist_entries, :referred_by
  end
end
