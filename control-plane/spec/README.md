# Rails Test Suite

This directory contains the complete RSpec test suite for the CourierX Rails API.

## Directory Structure

```
spec/
├── models/              # Model tests (validations, associations, scopes, methods)
├── requests/            # API endpoint tests (request specs)
│   └── api/v1/         # API v1 endpoints
├── services/            # Service object tests
├── jobs/               # Background job tests
├── integration/         # Full-stack integration tests
├── factories/           # FactoryBot test data factories
├── support/             # Test helpers and shared examples
│   ├── factory_bot.rb          # FactoryBot configuration
│   └── request_spec_helper.rb  # API testing helpers
├── spec_helper.rb       # RSpec configuration
└── rails_helper.rb      # Rails-specific configuration
```

## Running Tests

```bash
# All tests
bundle exec rspec

# Specific directory
bundle exec rspec spec/models/
bundle exec rspec spec/requests/

# Specific file
bundle exec rspec spec/models/tenant_spec.rb

# Specific test (by line number)
bundle exec rspec spec/models/tenant_spec.rb:25

# With coverage report
COVERAGE=true bundle exec rspec

# Fast mode (parallel)
bundle exec rspec --format progress

# Stop on first failure
bundle exec rspec --fail-fast
```

## Example Tests

We've included comprehensive example tests to serve as templates:

### Model Test Example
**File**: `spec/models/tenant_spec.rb`

Demonstrates:
- Validation testing with Shoulda Matchers
- Association testing
- Scope testing
- Instance method testing
- Complex business logic (soft delete, suspend, activate)
- Encryption testing

### Request Spec Example
**File**: `spec/requests/api/v1/products_spec.rb`

Demonstrates:
- JWT authentication testing
- API key authentication testing
- CRUD operations
- Pagination testing
- Filtering and search
- Error handling
- Permission checking (RBAC)
- Rate limiting

### Service Test Example
**File**: `spec/services/jwt_service_spec.rb`

Demonstrates:
- Service object testing
- JWT encoding/decoding
- Token expiration
- Security testing
- Error handling

### Integration Test Example
**File**: `spec/integration/email_sending_flow_spec.rb`

Demonstrates:
- Complete system flow testing (Rails → Go → Provider → Webhooks)
- HTTP stubbing with WebMock
- Background job testing
- Webhook verification
- Event tracking
- Error scenarios and retries

## Writing Tests

### Model Tests

```ruby
require 'rails_helper'

RSpec.describe MyModel, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:field) }
    it { should validate_uniqueness_of(:field) }
  end

  describe 'associations' do
    it { should belong_to(:parent) }
    it { should have_many(:children) }
  end

  describe '#my_method' do
    it 'does something' do
      model = create(:my_model)
      expect(model.my_method).to eq(expected_value)
    end
  end
end
```

### Request Specs

```ruby
require 'rails_helper'

RSpec.describe 'API Endpoint', type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe 'GET /api/v1/resource' do
    it 'returns resources' do
      create_list(:resource, 3, tenant: user.tenant)

      get '/api/v1/resource', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].length).to eq(3)
    end

    it 'requires authentication' do
      get '/api/v1/resource'

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
```

### Service Tests

```ruby
require 'rails_helper'

RSpec.describe MyService do
  describe '#call' do
    it 'performs the service' do
      service = described_class.new(params)
      result = service.call

      expect(result).to be_success
      expect(result.data).to include(expected_data)
    end
  end
end
```

## Test Helpers

### Authentication Helpers

Located in `spec/support/request_spec_helper.rb`:

```ruby
# JWT authentication
headers = auth_headers(user)
get '/api/v1/products', headers: headers

# API key authentication
headers = api_key_headers(product)
post '/api/v1/messages', headers: headers, params: params

# Parse JSON response
response_data = json_response
expect(json_response[:data]).to be_present
```

## Factories

Located in `spec/factories/`:

```ruby
# Create single record
tenant = create(:tenant)
user = create(:user, tenant: tenant)

# Create with overrides
admin = create(:user, role: 'admin')

# Create without saving
user = build(:user)

# Create with traits
tenant = create(:tenant, :with_users, :with_products)

# Create multiple records
users = create_list(:user, 5)
```

### Available Factories

- **Tenants** (`tenants.rb`)
  - Traits: `:with_users`, `:with_products`, `:suspended`, `:deleted`
- **Users** (`users.rb`)
  - Traits: `:owner`, `:admin`, `:member`
- **Products** (`products.rb`)
  - Traits: `:with_api_key`, `:inactive`

## Test Coverage

We use SimpleCov for code coverage tracking.

**Requirements**:
- Minimum overall coverage: **80%**
- Minimum per-file coverage: **70%**

**View coverage report**:
```bash
COVERAGE=true bundle exec rspec
open coverage/index.html
```

## Best Practices

1. **Use descriptive test names**: Test names should clearly explain what is being tested
   ```ruby
   # Good
   it 'creates a new product with valid attributes'

   # Bad
   it 'works'
   ```

2. **Follow Arrange-Act-Assert pattern**:
   ```ruby
   it 'does something' do
     # Arrange: Set up test data
     user = create(:user)

     # Act: Perform the action
     result = user.do_something

     # Assert: Verify the outcome
     expect(result).to be_truthy
   end
   ```

3. **Test one thing per test**: Each test should verify a single behavior

4. **Use factories, not fixtures**: FactoryBot provides flexible test data

5. **Stub external services**: Use WebMock to stub HTTP calls, don't make real requests

6. **Clean up test data**: Database Cleaner handles this automatically

7. **Test both happy path and edge cases**:
   ```ruby
   context 'with valid data' do
     it 'succeeds' do
       # Test success case
     end
   end

   context 'with invalid data' do
     it 'fails with error' do
       # Test error case
     end
   end
   ```

## Debugging Tests

```bash
# Run with detailed output
bundle exec rspec --format documentation

# Run only failed tests from last run
bundle exec rspec --only-failures

# Run tests modified since last commit
bundle exec rspec --only-changes

# Debug with pry
# Add `binding.pry` in your test, then:
bundle exec rspec spec/path/to/spec.rb
```

## CI/CD

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Manual workflow dispatch

See `.github/workflows/rails-tests.yml` for CI configuration.

## Additional Resources

- [RSpec Documentation](https://rspec.info/)
- [FactoryBot Documentation](https://github.com/thoughtbot/factory_bot)
- [Shoulda Matchers](https://github.com/thoughtbot/shoulda-matchers)
- [WebMock](https://github.com/bblimke/webmock)
- [SimpleCov](https://github.com/simplecov-ruby/simplecov)
- [TESTING.md](../../TESTING.md) - Complete testing guide
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
