# frozen_string_literal: true

# See https://rubydoc.info/gems/rspec-core/RSpec/Core/Configuration

require 'simplecov'

# Start SimpleCov for code coverage
SimpleCov.start 'rails' do
  add_filter '/spec/'
  add_filter '/config/'
  add_filter '/vendor/'

  add_group 'Models', 'app/models'
  add_group 'Controllers', 'app/controllers'
  add_group 'Services', 'app/services'
  add_group 'Jobs', 'app/jobs'
  add_group 'Mailers', 'app/mailers'

  minimum_coverage 80
  minimum_coverage_by_file 70
end

RSpec.configure do |config|
  # rspec-expectations config goes here
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  # rspec-mocks config goes here
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  # This option will default to `:apply_to_host_groups` in RSpec 4
  config.shared_context_metadata_behavior = :apply_to_host_groups

  # Limits the available syntax to the non-monkey patched syntax
  config.disable_monkey_patching!

  # Print the 10 slowest examples
  config.profile_examples = 10

  # Run specs in random order
  config.order = :random

  # Seed global randomization
  Kernel.srand config.seed
end
