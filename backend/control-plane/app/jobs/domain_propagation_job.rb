# frozen_string_literal: true

# DomainPropagationJob
#
# Fans a newly-created domain out to every connected provider, collecting
# their required DNS records into DomainProviderVerification rows. After
# propagation, kicks off the recurring poll job so verification status
# updates as DNS propagates.
#
class DomainPropagationJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(domain_id)
    domain = Domain.find_by(id: domain_id)
    return unless domain

    DomainProviderPropagationService.call(domain)
    DomainProviderPollJob.perform_in(1.minute, domain.id)
  end
end
