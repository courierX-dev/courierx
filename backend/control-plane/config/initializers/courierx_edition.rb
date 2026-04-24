# CourierX edition toggle.
#
# CourierX is open-core: the OSS control plane + Go engine run standalone, and
# the commercial cloud (billing, waitlist, compliance, managed sub-accounts,
# usage aggregation) lives in a SEPARATE Rails service at cloud/service/.
#
# The two talk over HTTP:
#   - Core → Cloud events: durable, via OutboxEvent(destination: "cloud")
#     delivered by CloudEventJob → POST /internal/events
#   - Core → Cloud gating:  sync, via CloudClient (500ms fail-open)
#
# When CLOUD_SERVICE_URL is set, the cloud service exists and the core wires up
# to it. When unset (OSS self-hosters), CloudClient is a null-object and the
# event outbox lane stays empty.
#
# CourierX::Edition.cloud? is a convenience alias for CloudClient.enabled? and
# the per-feature flag below drives any additional on/off gates.

module CourierX
  module Edition
    CLOUD_FEATURES = %i[
      billing_enforcement
      ai_managed
    ].freeze

    def self.cloud? = CloudClient.enabled?
    def self.oss?   = !cloud?

    def self.feature?(name)
      cloud? && CLOUD_FEATURES.include?(name.to_sym)
    end
  end
end
