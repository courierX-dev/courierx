class CreateMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :memberships, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :tenant, null: false, foreign_key: true, type: :uuid
      t.string :role

      t.timestamps
    end
  end
end
