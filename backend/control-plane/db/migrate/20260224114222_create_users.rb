class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users, id: :uuid do |t|
      t.string :email
      t.string :first_name
      t.string :last_name
      t.string :provider
      t.string :uid

      t.timestamps
    end
  end
end
