# frozen_string_literal: true

class CreateEmailTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :email_templates, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid   :tenant_id,   null: false
      t.string :name,         null: false
      t.string :description
      t.string :subject
      t.text   :html_body
      t.text   :text_body
      t.string :category                          # transactional, marketing, notification, etc.
      t.jsonb  :variables,    default: [],  null: false  # declared variable schema [{name, default, required}]
      t.jsonb  :metadata,     default: {},  null: false
      t.string :status,       default: "draft", null: false # draft, active, archived
      t.integer :version,     default: 1,   null: false
      t.timestamps
    end

    add_index :email_templates, :tenant_id
    add_index :email_templates, [:tenant_id, :name], unique: true
    add_index :email_templates, [:tenant_id, :status]

    # Optional: add template_id to emails so we can track which template was used
    add_column :emails, :email_template_id, :uuid
    add_index  :emails, :email_template_id
  end
end
