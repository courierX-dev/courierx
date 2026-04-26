# Be sure to restart your server when you modify this file.

# Add new inflection rules using the following format. Inflections
# are locale specific, and you may define rules for as many different
# locales as you wish. All of these examples are active by default:
# ActiveSupport::Inflector.inflections(:en) do |inflect|
#   inflect.plural /^(ox)$/i, "\\1en"
#   inflect.singular /^(ox)en/i, "\\1"
#   inflect.irregular "person", "people"
#   inflect.uncountable %w( fish sheep )
# end

# These inflection rules are supported but not enabled by default:
# ActiveSupport::Inflector.inflections(:en) do |inflect|
#   inflect.acronym "RESTful"
# end

# Note: we deliberately do NOT register a "quota" → "quotas" inflection here.
# The string-form rule fires inside compound names (e.g. "provider_quota_usage"
# pluralized to "provider_quotas_usage"), breaking sibling table lookups.
# Affected models (ProviderQuota, ProviderQuotaUsage) pin `self.table_name`
# explicitly instead.
