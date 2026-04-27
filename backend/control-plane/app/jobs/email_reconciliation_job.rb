# frozen_string_literal: true

# EmailReconciliationJob
#
# Async wrapper around EmailReconciliationService. Used by the bulk
# /api/v1/emails/reconcile_stale endpoint and the rake task so the HTTP
# request returns quickly and provider polling happens off the request
# thread.
class EmailReconciliationJob
  include Sidekiq::Job

  # Reconciliation is best-effort; transient failures shouldn't pile up forever.
  sidekiq_options queue: :default, retry: 3

  def perform(email_id)
    email = Email.find_by(id: email_id)
    return unless email

    result = EmailReconciliationService.call(email: email)
    Rails.logger.info "[EmailReconciliation] email=#{email.id} action=#{result.action} detail=#{result.detail}"
  end
end
