# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_22_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "api_keys", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.string "key_hash", null: false
    t.string "key_prefix", null: false
    t.datetime "last_used_at"
    t.string "name", null: false
    t.string "scopes", default: [], array: true
    t.string "status", default: "active", null: false
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["key_hash"], name: "index_api_keys_on_key_hash", unique: true
    t.index ["tenant_id", "status"], name: "index_api_keys_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_api_keys_on_tenant_id"
  end

  create_table "compliance_documents", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "compliance_profile_id", null: false
    t.datetime "created_at", null: false
    t.string "document_type", null: false
    t.string "file_name", null: false
    t.integer "file_size_bytes"
    t.string "s3_key", null: false
    t.datetime "updated_at", null: false
    t.index ["compliance_profile_id"], name: "index_compliance_documents_on_compliance_profile_id"
  end

  create_table "compliance_profiles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "anti_spam_policy_accepted", default: false, null: false
    t.datetime "anti_spam_policy_accepted_at"
    t.string "business_type"
    t.string "country"
    t.datetime "created_at", null: false
    t.integer "estimated_monthly_volume"
    t.string "legal_name"
    t.text "review_note"
    t.datetime "reviewed_at"
    t.string "reviewed_by"
    t.string "sending_categories", default: [], array: true
    t.string "status", default: "pending", null: false
    t.datetime "submitted_at"
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.text "use_case_description"
    t.string "website"
    t.index ["tenant_id"], name: "index_compliance_profiles_on_tenant_id", unique: true
  end

  create_table "domain_provider_verifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "domain_id", null: false
    t.string "external_domain_id"
    t.string "provider", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["domain_id", "provider"], name: "index_domain_provider_verifications_on_domain_id_and_provider", unique: true
    t.index ["domain_id"], name: "index_domain_provider_verifications_on_domain_id"
  end

  create_table "domains", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "dkim_public_key"
    t.string "dkim_selector"
    t.string "dmarc_policy"
    t.string "domain", null: false
    t.string "spf_record"
    t.string "status", default: "pending", null: false
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.string "verification_token"
    t.datetime "verified_at"
    t.index ["domain"], name: "index_domains_on_domain"
    t.index ["tenant_id", "domain"], name: "index_domains_on_tenant_id_and_domain", unique: true
    t.index ["tenant_id"], name: "index_domains_on_tenant_id"
    t.index ["verification_token"], name: "index_domains_on_verification_token", unique: true, where: "(verification_token IS NOT NULL)"
  end

  create_table "email_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "bounce_code"
    t.text "bounce_message"
    t.string "bounce_type"
    t.datetime "created_at", null: false
    t.uuid "email_id", null: false
    t.string "event_type", null: false
    t.string "ip_address"
    t.string "link_url"
    t.datetime "occurred_at", null: false
    t.string "provider", null: false
    t.jsonb "raw_payload", default: {}, null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.index ["email_id", "event_type"], name: "index_email_events_on_email_id_and_event_type"
    t.index ["email_id", "occurred_at"], name: "index_email_events_on_email_id_and_occurred_at"
    t.index ["email_id"], name: "index_email_events_on_email_id"
    t.index ["occurred_at"], name: "index_email_events_on_occurred_at"
  end

  create_table "emails", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "attempt_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.uuid "domain_id"
    t.string "from_email", null: false
    t.string "from_name"
    t.text "html_body"
    t.text "last_error"
    t.uuid "mcp_connection_id"
    t.jsonb "metadata", default: {}, null: false
    t.uuid "outbox_event_id"
    t.uuid "provider_connection_id"
    t.string "provider_message_id"
    t.datetime "queued_at", default: -> { "now()" }, null: false
    t.string "reply_to"
    t.jsonb "routing_attempts"
    t.datetime "sent_at"
    t.string "status", default: "queued", null: false
    t.string "subject", null: false
    t.string "tags", default: [], array: true
    t.uuid "tenant_id", null: false
    t.text "text_body"
    t.string "to_email", null: false
    t.string "to_name"
    t.datetime "updated_at", null: false
    t.index ["domain_id"], name: "index_emails_on_domain_id"
    t.index ["mcp_connection_id"], name: "index_emails_on_mcp_connection_id"
    t.index ["outbox_event_id"], name: "index_emails_on_outbox_event_id", where: "(outbox_event_id IS NOT NULL)"
    t.index ["provider_connection_id"], name: "index_emails_on_provider_connection_id"
    t.index ["provider_message_id"], name: "index_emails_on_provider_message_id", where: "(provider_message_id IS NOT NULL)"
    t.index ["tenant_id", "created_at"], name: "index_emails_on_tenant_id_and_created_at"
    t.index ["tenant_id", "status"], name: "index_emails_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_emails_on_tenant_id"
    t.index ["to_email"], name: "index_emails_on_to_email"
  end

  create_table "managed_sub_accounts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "daily_limit"
    t.string "dedicated_ips", default: [], array: true
    t.string "encrypted_api_key", null: false
    t.string "encrypted_api_key_iv", null: false
    t.string "external_id", null: false
    t.integer "monthly_limit"
    t.string "provider", null: false
    t.string "region"
    t.string "shared_pool_id"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "external_id"], name: "index_managed_sub_accounts_on_provider_and_external_id", unique: true
  end

  create_table "mcp_audit_logs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.float "confidence_score"
    t.datetime "created_at", default: -> { "now()" }, null: false
    t.integer "duration_ms"
    t.uuid "email_id"
    t.text "error_message"
    t.boolean "human_approved"
    t.jsonb "input_params", default: {}, null: false
    t.string "ip_address"
    t.uuid "mcp_connection_id", null: false
    t.string "model_name"
    t.text "output_summary"
    t.string "prompt_hash"
    t.boolean "success", default: false, null: false
    t.uuid "tenant_id", null: false
    t.string "tool_name", null: false
    t.index ["mcp_connection_id", "created_at"], name: "index_mcp_audit_logs_on_mcp_connection_id_and_created_at"
    t.index ["tenant_id", "created_at"], name: "index_mcp_audit_logs_on_tenant_id_and_created_at"
  end
