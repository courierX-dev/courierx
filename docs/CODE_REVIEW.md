# CourierX — Code Review Report

**Date:** 2026-04-19  
**Scope:** Rails control plane + Go core engine — correctness, performance, quality (security audited separately in SECURITY_AUDIT.md)

---

## Critical Issues (bugs / data loss risk)

### C-1: Non-atomic outbox write — email can be created without a linked outbox event
**File:** `app/services/email_dispatch_service.rb`

Steps 3 and 4 are three separate DB writes (`create`, `create!`, `update!`) with no wrapping transaction. If the process crashes between `create_email` and `OutboxEvent.create!`, the email row exists with `status: "queued"` but no outbox event — it will never be sent and will never appear as a failure.

**Fix:**
```ruby
ActiveRecord::Base.transaction do
  email = current_tenant.emails.create!(email_attrs)
  outbox = OutboxEvent.create!(tenant_id: current_tenant.id, payload: { email_id: email.id })
  email.update!(outbox_event_id: outbox.id)
end
```

---

### C-2: Outbox event double-processing race condition
**File:** `app/jobs/outbox_processor_job.rb`

```ruby
return if event.status == "processed"
event.process!
```

Two concurrent Sidekiq workers (common with retry storms) can both pass the guard and send the same email twice. The read and write are not atomic.

**Fix:** Replace with a single conditional UPDATE:
```ruby
updated = OutboxEvent.where(id: event.id, status: "pending")
                     .update_all(status: "processing", processed_at: Time.current)
return if updated.zero?
```

---

### C-3: `mark_failed!` called on uninitialized variable
**File:** `app/jobs/outbox_processor_job.rb`

`email` is assigned after `event.process!`. If `process!` raises, `email` is `nil` and `email&.mark_failed!` silently no-ops — leaving the email stuck in `queued` forever.

**Fix:** Assign email before the rescue boundary:
```ruby
email = Email.find_by(id: event.payload["email_id"])
begin
  event.process!
  # ... send ...
rescue => e
  event&.fail!(e.message)
  email&.mark_failed!(error: e.message)
  raise
end
```

---

### C-4: `Domain#verify!` bypasses DNS verification entirely
**File:** `app/controllers/api/v1/domains_controller.rb`, `app/models/domain.rb`

The `verify` controller action calls `domain.verify!` directly, which sets `status: "verified"` unconditionally with no DNS check. A tenant can mark any domain as verified with a single POST.

**Fix:** The controller action should enqueue the job and return 202:
```ruby
def verify
  @domain.update!(status: "pending_verification")
  DomainVerificationJob.perform_async(@domain.id)
  render json: { message: "Verification started" }, status: :accepted
end
```
Reserve `Domain#verify!` for internal use by `DomainVerificationJob` only.

---

### C-5: SES tags encode key and value identically
**File:** `backend/core-go/internal/providers/ses.go`

```go
sesReq.EmailTags = append(sesReq.EmailTags, sesTag{Name: tag, Value: tag})
```

SES tags require a distinct `Name` and `Value`. Tags containing disallowed characters (spaces, special chars) cause a 400 that is misclassified as `ErrorPermanent`, suppressing failover.

**Fix:** Sanitize tag values and define a `name:value` convention, or strip tags from SES requests until properly implemented.

---

### C-6: Template cache unbounded — OOM risk
**File:** `backend/core-go/internal/template/template.go`

`sync.Map` has no eviction. Every unique template body is stored forever. Bulk sends with per-recipient variable interpolation can produce thousands of unique keys.

**Fix:** Replace with an LRU cache (`github.com/hashicorp/golang-lru/v2`) with a max size of ~1000 entries. Use a hash of the source as the cache key to reduce memory per entry.

---

## Performance Issues

### P-1: N+1 queries in `UsageRollupJob`
**File:** `app/jobs/usage_rollup_job.rb`

~77 DB queries per tenant. With 100 tenants: ~7,700 queries per job run.

**Fix:** Replace with a single GROUP BY aggregation:
```ruby
counts = emails.group(:status).count
# { "delivered" => 412, "bounced" => 12, ... }
```

---

### P-2: `WebhookDeliveryJob` runs COUNT on every invocation
**File:** `app/jobs/webhook_delivery_job.rb`

`attempt_number: (endpoint.webhook_deliveries.where(...).count + 1)` — unbounded table scan on a potentially large relation.

**Fix:** Track the attempt count in the job itself or add a counter column on `WebhookDelivery`.

---

### P-3: Provider instantiated on every send attempt in Go router
**File:** `backend/core-go/internal/providers/router.go`

`NewProvider(route.Provider)` is called inside the send loop, creating a new `http.Client` and resetting the connection pool on every send.

**Fix:** Instantiate providers at `NewRouter` time and store `[]Provider` rather than `[]types.Route`.

---

### P-4: `ProviderHealthCheckJob` calls non-existent Go endpoint
**File:** `app/jobs/provider_health_check_job.rb`

`GET /v1/health/provider/:type` does not exist in the Go handlers — every health check hits a 404 and marks all providers as unhealthy.

**Fix:** Implement the `/v1/health/provider/:type` endpoint in Go's handler, or change the job to use a provider-specific lightweight check.

---

### P-5: `EmailsController#index` — unbounded `per_page`
**File:** `app/controllers/api/v1/emails_controller.rb`

`limit(params[:per_page]&.to_i || 25)` allows unlimited page sizes.

**Fix:**
```ruby
per = [params[:per_page].to_i, 100].clamp(1, 100)
emails = emails.limit(per)
```

---

### P-6: `db.go` — missing connection idle timeout and max lifetime
**File:** `backend/core-go/internal/db/db.go`

No `MaxConnIdleTime` or `MaxConnLifetime` configured. Idle connections are never recycled — causes silent failures behind cloud load balancers that close idle TCP connections.

**Fix:**
```go
config.MaxConnIdleTime = 5 * time.Minute
config.MaxConnLifetime = 1 * time.Hour
```

---

## Correctness Issues

### CR-1: Suppression check doesn't normalize `to_email`
**File:** `app/models/suppression.rb`, `app/services/email_dispatch_service.rb`

`Suppression.suppressed?` normalizes to `downcase.strip`, but `to_email` is stored as-is. `"User@Example.COM"` won't match a suppression for `"user@example.com"`.

**Fix:** Add `before_validation { self.to_email = to_email&.downcase&.strip }` to `Email`. Add a case-insensitive unique index on `suppressions.email`.

---

### CR-2: Idempotency key never forwarded to Go engine
**File:** `app/jobs/outbox_processor_job.rb`

`idempotency_key` is read from `event.payload` where it was never written. The Go-side idempotency check is dead for all outbox-driven sends — duplicate sends are possible on Sidekiq retry storms.

**Fix:** Write `idempotency_key` to the outbox payload in `EmailDispatchService`:
```ruby
OutboxEvent.create!(payload: { email_id: email.id, idempotency_key: @params[:idempotency_key] })
```

---

### CR-3: `OutboxEvent#fail!` causes double-backoff
**File:** `app/models/outbox_event.rb`

`fail!` sets `status: "pending"` with a `process_after` delay, AND Sidekiq retries the job with its own exponential backoff. Both mechanisms stack, causing delays that grow faster than expected.

**Fix:** Choose one retry mechanism. Recommended: use Sidekiq's native retry and remove `process_after` from the outbox model, relying solely on the Sidekiq retry schedule.

---

### CR-4: `Tenant#generate_slug` TOCTOU race
**File:** `app/models/tenant.rb`

Two concurrent tenant creations with the same name will both read `Tenant.exists? => false` and attempt the same slug, causing a `PG::UniqueViolation` surfaced as a 500.

**Fix:** Handle `ActiveRecord::RecordNotUnique` in the model with a retry:
```ruby
rescue ActiveRecord::RecordNotUnique
  self.slug = "#{base_slug}-#{SecureRandom.hex(4)}"
  retry
end
```

---

### CR-5: `DomainVerificationJob` opens multiple `Resolv::DNS` instances per run
**File:** `app/jobs/domain_verification_job.rb`

`check_spf`, `check_dkim`, and `check_txt_via_resolv` each open a separate DNS resolver (three UDP socket pools for one job run).

**Fix:** Create a single `Resolv::DNS` instance at the `perform` level and pass it to each helper.

---

### CR-6: `AdminTenantsController#impersonate` — no authorization guard
**File:** `app/controllers/api/v1/admin/tenants_controller.rb`

No check that the admin has an `impersonate` permission or that the target tenant is in a valid state for impersonation (e.g., suspended tenants shouldn't be impersonable).

**Fix:** Add explicit permission check and audit log (see SECURITY_AUDIT.md H-3).

---

### CR-7: `ProviderConnection` uniqueness constraint too restrictive
**File:** `app/models/provider_connection.rb`

`validates :provider, uniqueness: { scope: [:tenant_id, :mode] }` prevents a tenant from having two SendGrid connections (e.g., transactional + marketing).

**Fix:** Scope to `[:tenant_id, :mode, :display_name]` or remove the constraint entirely and let routing rules manage selection.

---

## Quality Issues

### Q-1: SendGrid message ID fallback is not unique
**File:** `backend/core-go/internal/providers/sendgrid.go`

`msgID = "sg-" + req.To` — if the same recipient gets two emails in the same session, both records share the same synthetic ID, corrupting the delivery log.

**Fix:** Use `"sg-unknown-" + uuid.New().String()` to guarantee uniqueness.

---

### Q-2: Error classification is string-matching on provider messages
**File:** `backend/core-go/internal/providers/provider.go`

`ClassifyError` matches on error message substrings. Future provider API changes silently flip permanent ↔ transient classification, breaking failover logic.

**Fix:** Wrap provider errors in typed structs and use `errors.As`:
```go
type PermanentError struct { Code int; Message string }
func (e *PermanentError) Error() string { return e.Message }
```

---

### Q-3: `Email` model missing `belongs_to :outbox_event`
**File:** `app/models/email.rb`

`outbox_event_id` is written but not declared as an association. `email.outbox_event` will raise `NoMethodError`.

**Fix:** Add `belongs_to :outbox_event, optional: true` to the Email model.

---

### Q-4: `outbox_processor_job.rb` embeds plaintext credentials in request body
**File:** `app/jobs/outbox_processor_job.rb`

Provider credentials (`api_key`, `secret`, `accessKeyId`, etc.) are sent in the JSON payload to Go. Faraday logging or Rails log middleware could expose plaintext credentials.

**Fix:** Disable Faraday request body logging for this connection. Add a `# SECURITY: Do not log this request` comment and ensure `config.log_level` is not `:debug` in production.

---

### Q-5: `BulkSendRequest` missing `ReplyTo` field
**File:** `backend/core-go/internal/types/types.go`

`BulkSendRequest` has no `ReplyTo` while `SendRequest` does. Bulk sends cannot set a reply-to address.

**Fix:** Add `ReplyTo string \`json:"replyTo,omitempty"\`` to `BulkSendRequest` and map it in `sendOne`.
