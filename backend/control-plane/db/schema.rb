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

ActiveRecord::Schema[8.1].define(version: 2026_04_20_000001) do
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

  create_table "email_templates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "category"
    t.datetime "created_at", null: false
    t.string "description"
    t.text "html_body"
    t.jsonb "metadata", default: {}, null: false
    t.string "name", null: false
    t.string "status", default: "draft", null: false
    t.string "subject"
    t.uuid "tenant_id", null: false
    t.text "text_body"
    t.datetime "updated_at", null: false
    t.jsonb "variables", default: [], null: false
    t.integer "version", default: 1, null: false
    t.index ["tenant_id", "name"], name: "index_email_templates_on_tenant_id_and_name", unique: true
    t.index ["tenant_id", "status"], name: "index_email_templates_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_email_templates_on_tenant_id"
  end

  create_table "emails", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "attempt_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.uuid "domain_id"
    t.uuid "email_template_id"
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
    t.index ["email_template_id"], name: "index_emails_on_email_template_id"
    t.index ["mcp_connection_id"], name: "index_emails_on_mcp_connection_id"
    t.index ["outbox_event_id"], name: "index_emails_on_outbox_event_id", where: "(outbox_event_id IS NOT NULL)"
    t.index ["provider_connection_id"], name: "index_emails_on_provider_connection_id"
    t.index ["provider_message_id"], name: "index_emails_on_provider_message_id", where: "(provider_message_id IS NOT NULL)"
    t.index ["tenant_id", "created_at"], name: "index_emails_on_tenant_id_and_created_at"
    t.index ["tenant_id", "status"], name: "index_emails_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_emails_on_tenant_id"
    t.index ["to_email"], name: "index_emails_on_to_email"
  end

  create_table "invitations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at", null: false
    t.uuid "invited_by_id", null: false
    t.string "role", default: "developer", null: false
    t.string "status", default: "pending", null: false
    t.uuid "tenant_id", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "email"], name: "idx_pending_invitations_unique", unique: true, where: "((status)::text = 'pending'::text)"
    t.index ["tenant_id", "status"], name: "index_invitations_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_invitations_on_tenant_id"
    t.index ["token"], name: "index_invitations_on_token", unique: true
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

  create_table "mcp_connections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "allowed_from_emails", default: [], array: true
    t.string "allowed_tags", default: [], array: true
    t.string "client_id", null: false
    t.string "client_secret_hash", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "last_connected_at"
    t.datetime "last_used_at"
    t.integer "max_emails_per_run"
    t.string "name", null: false
    t.string "permissions", default: ["send_email"], array: true
    t.boolean "require_approval", default: false, null: false
    t.string "status", default: "connected", null: false
    t.uuid "tenant_id", null: false
    t.integer "total_emails_sent", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_mcp_connections_on_client_id", unique: true
    t.index ["tenant_id"], name: "index_mcp_connections_on_tenant_id"
  end

  create_table "memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "role"
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["tenant_id"], name: "index_memberships_on_tenant_id"
    t.index ["user_id"], name: "index_memberships_on_user_id"
  end

  create_table "messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "body_html"
    t.text "body_text"
    t.datetime "created_at", default: -> { "now()" }, null: false
    t.bigint "duration_ms", default: 0, null: false
    t.string "from_email", null: false
    t.string "idempotency_key"
    t.jsonb "metadata", default: {}
    t.string "project_id"
    t.string "provider_used"
    t.string "status", default: "sent", null: false
    t.string "subject", null: false
    t.string "tags", default: [], array: true
    t.uuid "tenant_id"
    t.string "to_email", null: false
    t.index ["idempotency_key"], name: "index_messages_on_idempotency_key", unique: true, where: "(idempotency_key IS NOT NULL)"
    t.index ["provider_used"], name: "index_messages_on_provider_used"
    t.index ["tenant_id", "created_at"], name: "index_messages_on_tenant_id_and_created_at"
    t.index ["tenant_id"], name: "index_messages_on_tenant_id"
  end

  create_table "outbox_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "attempt_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.text "last_error"
    t.integer "max_attempts", default: 5, null: false
    t.jsonb "payload", default: {}, null: false
    t.datetime "process_after"
    t.datetime "processed_at"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_outbox_events_on_created_at"
    t.index ["status", "process_after"], name: "idx_outbox_pickup"
  end

  create_table "provider_connections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "avg_latency_ms"
    t.integer "consecutive_failures", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "encrypted_api_key"
    t.string "encrypted_api_key_iv"
    t.string "encrypted_secret"
    t.string "encrypted_secret_iv"
    t.datetime "last_health_check_at"
    t.uuid "managed_sub_account_id"
    t.string "mode", default: "byok", null: false
    t.integer "priority", default: 1, null: false
    t.string "provider", null: false
    t.string "region"
    t.string "smtp_host"
    t.integer "smtp_port"
    t.string "status", default: "active", null: false
    t.float "success_rate"
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.integer "weight", default: 100, null: false
    t.index ["managed_sub_account_id"], name: "index_provider_connections_on_managed_sub_account_id"
    t.index ["tenant_id", "provider", "mode"], name: "index_provider_connections_on_tenant_id_and_provider_and_mode", unique: true
    t.index ["tenant_id", "status"], name: "index_provider_connections_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_provider_connections_on_tenant_id"
  end

  create_table "rate_limit_policies", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "demo_max_total"
    t.boolean "demo_restricted", default: false, null: false
    t.integer "max_per_day", default: 10000, null: false
    t.integer "max_per_hour", default: 1000, null: false
    t.integer "max_per_minute", default: 60, null: false
    t.integer "max_per_month", default: 100000, null: false
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id"], name: "index_rate_limit_policies_on_tenant_id", unique: true
  end

  create_table "routing_rule_providers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "failover_only", default: false, null: false
    t.integer "priority", default: 1, null: false
    t.uuid "provider_connection_id", null: false
    t.uuid "routing_rule_id", null: false
    t.datetime "updated_at", null: false
    t.integer "weight", default: 100, null: false
    t.index ["provider_connection_id"], name: "index_routing_rule_providers_on_provider_connection_id"
    t.index ["routing_rule_id", "provider_connection_id"], name: "idx_rrp_rule_provider", unique: true
    t.index ["routing_rule_id"], name: "index_routing_rule_providers_on_routing_rule_id"
  end

  create_table "routing_rules", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_active", default: true, null: false
    t.boolean "is_default", default: false, null: false
    t.string "match_from_domain"
    t.string "match_tag"
    t.string "name", null: false
    t.string "strategy", default: "priority", null: false
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "is_active"], name: "index_routing_rules_on_tenant_id_and_is_active"
    t.index ["tenant_id", "is_default"], name: "index_routing_rules_on_tenant_id_and_is_default"
    t.index ["tenant_id"], name: "index_routing_rules_on_tenant_id"
  end

  create_table "suppressions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.text "note"
    t.string "reason", null: false
    t.uuid "source_email_id"
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "email"], name: "index_suppressions_on_tenant_id_and_email", unique: true
    t.index ["tenant_id"], name: "index_suppressions_on_tenant_id"
  end

  create_table "tenants", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "billing_customer_id"
    t.string "billing_provider"
    t.string "billing_subscription_id"
    t.datetime "created_at", null: false
    t.datetime "current_period_ends_at"
    t.string "email", null: false
    t.string "mode", default: "demo", null: false
    t.string "name", null: false
    t.string "password_digest"
    t.string "plan", default: "free", null: false
    t.integer "plan_email_limit", default: 100
    t.string "plan_id"
    t.jsonb "settings", default: {}, null: false
    t.string "slug", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_customer_id"], name: "index_tenants_on_billing_customer_id", unique: true, where: "(billing_customer_id IS NOT NULL)"
    t.index ["billing_subscription_id"], name: "index_tenants_on_billing_subscription_id", unique: true, where: "(billing_subscription_id IS NOT NULL)"
    t.index ["email"], name: "index_tenants_on_email", unique: true
    t.index ["slug"], name: "index_tenants_on_slug", unique: true
    t.index ["status"], name: "index_tenants_on_status"
  end

  create_table "usage_stats", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.integer "emails_bounced", default: 0, null: false
    t.integer "emails_clicked", default: 0, null: false
    t.integer "emails_complained", default: 0, null: false
    t.integer "emails_delivered", default: 0, null: false
    t.integer "emails_failed", default: 0, null: false
    t.integer "emails_opened", default: 0, null: false
    t.integer "emails_sent", default: 0, null: false
    t.string "provider"
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "date", "provider"], name: "idx_usage_stats_tenant_date_provider", unique: true
    t.index ["tenant_id", "date"], name: "index_usage_stats_on_tenant_id_and_date"
    t.index ["tenant_id"], name: "index_usage_stats_on_tenant_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.string "first_name"
    t.string "last_name"
    t.string "provider"
    t.string "uid"
    t.datetime "updated_at", null: false
  end

  create_table "waitlist_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "company"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "invited_at"
    t.string "name"
    t.integer "position", null: false
    t.string "referral_code", null: false
    t.string "referred_by"
    t.string "status", default: "pending", null: false
    t.uuid "tenant_id"
    t.datetime "updated_at", null: false
    t.string "use_case"
    t.index ["email"], name: "index_waitlist_entries_on_email", unique: true
    t.index ["position"], name: "index_waitlist_entries_on_position", unique: true
    t.index ["referral_code"], name: "index_waitlist_entries_on_referral_code", unique: true
    t.index ["referred_by"], name: "index_waitlist_entries_on_referred_by"
    t.index ["status"], name: "index_waitlist_entries_on_status"
    t.index ["tenant_id"], name: "index_waitlist_entries_on_tenant_id"
  end

  create_table "webhook_deliveries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "attempt_count", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.uuid "email_event_id"
    t.datetime "next_retry_at"
    t.jsonb "payload", default: {}, null: false
    t.text "response_body"
    t.integer "response_status"
    t.boolean "success", default: false, null: false
    t.datetime "updated_at", null: false
    t.uuid "webhook_endpoint_id", null: false
    t.index ["next_retry_at"], name: "index_webhook_deliveries_on_next_retry_at", where: "((success = false) AND (next_retry_at IS NOT NULL))"
    t.index ["webhook_endpoint_id", "success"], name: "index_webhook_deliveries_on_webhook_endpoint_id_and_success"
    t.index ["webhook_endpoint_id"], name: "index_webhook_deliveries_on_webhook_endpoint_id"
  end

  create_table "webhook_endpoints", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description"
    t.string "events", default: [], array: true
    t.boolean "is_active", default: true, null: false
    t.string "secret", null: false
    t.uuid "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.string "url", null: false
    t.index ["tenant_id", "is_active"], name: "index_webhook_endpoints_on_tenant_id_and_is_active"
    t.index ["tenant_id"], name: "index_webhook_endpoints_on_tenant_id"
  end

  add_foreign_key "api_keys", "tenants"
  add_foreign_key "compliance_documents", "compliance_profiles"
  add_foreign_key "compliance_profiles", "tenants"
  add_foreign_key "domain_provider_verifications", "domains"
  add_foreign_key "domains", "tenants"
  add_foreign_key "email_events", "emails"
  add_foreign_key "emails", "domains"
  add_foreign_key "emails", "mcp_connections"
  add_foreign_key "emails", "provider_connections"
  add_foreign_key "emails", "tenants"
  add_foreign_key "mcp_connections", "tenants"
  add_foreign_key "memberships", "tenants"
  add_foreign_key "memberships", "users"
  add_foreign_key "provider_connections", "managed_sub_accounts"
  add_foreign_key "provider_connections", "tenants"
  add_foreign_key "rate_limit_policies", "tenants"
  add_foreign_key "routing_rule_providers", "provider_connections"
  add_foreign_key "routing_rule_providers", "routing_rules"
  add_foreign_key "routing_rules", "tenants"
  add_foreign_key "suppressions", "tenants"
  add_foreign_key "usage_stats", "tenants"
  add_foreign_key "waitlist_entries", "tenants"
  add_foreign_key "webhook_deliveries", "webhook_endpoints"
  add_foreign_key "webhook_endpoints", "tenants"
end
