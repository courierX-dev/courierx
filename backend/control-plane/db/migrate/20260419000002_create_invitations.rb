# frozen_string_literal: true

class CreateInvitations < ActiveRecord::Migration[8.1]
  def change
    create_table :invitations, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid   :tenant_id,    null: false
      t.uuid   :invited_by_id, null: false   # user id of the inviter
      t.string :email,        null: false
      t.string :role,         null: false, default: "developer"
      t.string :token,        null: false
      t.string :status,       null: false, default: "pending" # pending, accepted, revoked, expired
      t.datetime :expires_at, null: false
      t.datetime :accepted_at
      t.timestamps
    end

    add_index :invitations, :token, unique: true
    add_index :invitations, :tenant_id
    add_index :invitations, [:tenant_id, :email], unique: true, where: "status = 'pending'", name: "idx_pending_invitations_unique"
    add_index :invitations, [:tenant_id, :status]
  end
end
