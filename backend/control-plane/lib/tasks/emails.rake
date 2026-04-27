# frozen_string_literal: true

namespace :emails do
  desc "Reconcile stale emails (queued/sent past threshold). " \
       "Optional: TENANT_ID=<uuid> to scope, DRY_RUN=1 to preview only."
  task reconcile_stale: :environment do
    threshold = EmailReconciliationService::STALE_QUEUED_THRESHOLD.ago
    scope = Email.where(status: %w[queued sent]).where("created_at < ?", threshold)
    scope = scope.where(tenant_id: ENV["TENANT_ID"]) if ENV["TENANT_ID"].present?

    total = scope.count
    by_tenant = scope.group(:tenant_id, :status).count

    puts "── Reconciler sweep ──"
    puts "Threshold: created_at < #{threshold.iso8601} (#{EmailReconciliationService::STALE_QUEUED_THRESHOLD.inspect} ago)"
    puts "Tenant scope: #{ENV['TENANT_ID'] || 'ALL'}"
    puts "Candidates: #{total}"
    by_tenant.each { |(tid, status), n| puts "  tenant=#{tid&.first(8)} status=#{status} count=#{n}" }

    if ENV["DRY_RUN"] == "1"
      puts "DRY_RUN=1 — no jobs enqueued."
      next
    end

    enqueued = 0
    scope.find_each do |email|
      EmailReconciliationJob.perform_async(email.id)
      enqueued += 1
    end
    puts "Enqueued #{enqueued} reconciliation jobs."
  end
end
