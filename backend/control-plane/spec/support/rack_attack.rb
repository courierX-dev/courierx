# frozen_string_literal: true

# Disable Rack::Attack entirely in tests. The middleware throttles/bans by IP
# using Redis, which causes flaky 403s when the test IP accumulates ban state
# across multiple test runs. The IP-level protection is integration-tested
# separately; unit and request specs should not be affected by it.
Rack::Attack.enabled = false
