class CreateComplianceProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :compliance_profiles, id: :uuid do |t|
      t.references :tenant, null: false, foreign_key: true, type: :uuid, index: { unique: true }
      t.string     :legal_name
      t.string     :country
      t.string     :website
      t.string     :business_type
      t.text       :use_case_description
      t.integer    :estimated_monthly_volume
      t.string     :sending_categories, array: true, default: []
      t.boolean    :anti_spam_policy_accepted,    null: false, default: false
      t.datetime   :anti_spam_policy_accepted_at
      t.string     :status,      null: false, default: "pending"
      t.text       :review_note
      t.datetime   :reviewed_at
      t.string     :reviewed_by
      t.datetime   :submitted_at

      t.timestamps
    end
  end
end
