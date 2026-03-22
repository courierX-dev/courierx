class CreateComplianceDocuments < ActiveRecord::Migration[7.1]
  def change
    create_table :compliance_documents, id: :uuid do |t|
      t.references :compliance_profile, null: false, foreign_key: true, type: :uuid
      t.string     :document_type,      null: false
      t.string     :file_name,          null: false
      t.string     :s3_key,             null: false
      t.integer    :file_size_bytes

      t.timestamps
    end
  end
end
