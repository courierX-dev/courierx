# CourierX Story Details & Acceptance Criteria

This document provides detailed acceptance criteria, technical specifications, and test scenarios for each story in the CourierX development roadmap.

## Table of Contents

- [Milestone 1: Foundation & Core Infrastructure](#milestone-1-foundation--core-infrastructure)
  - [Epic 1.1: Rails Core Models](#epic-11-rails-core-models)
  - [Epic 1.2: Authentication & Authorization](#epic-12-authentication--authorization)
  - [Epic 1.3: Go Provider System](#epic-13-go-provider-system)
- [Milestone 2: Core Features & API Development](#milestone-2-core-features--api-development)
- [Testing Requirements](#testing-requirements)

---

## Milestone 1: Foundation & Core Infrastructure

### Epic 1.1: Rails Core Models

#### CP-001: Create Tenant Model (3 pts)

**Description**: Implement the Tenant model to represent organizations/teams using the platform.

**Technical Requirements**:
- Database table with proper indexes
- Soft delete support (deleted_at timestamp)
- Slug generation from name
- JSONB settings field for flexible configuration
- Status management (active, suspended, deleted)

**Acceptance Criteria**:
- [ ] Tenant table created with all required fields
- [ ] Name validation (2-100 characters, required)
- [ ] Slug validation (unique, lowercase alphanumeric + hyphens only)
- [ ] Slug auto-generated from name on create
- [ ] Status defaults to 'active'
- [ ] soft_delete method marks tenant as deleted without removing from database
- [ ] Unit tests cover:
  - Valid tenant creation
  - Invalid inputs (blank name, duplicate slug)
  - Slug generation edge cases
  - Soft delete functionality
  - Association cascades
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Positive tests
- Create tenant with valid name
- Create tenant with custom slug
- Update tenant name (slug remains unchanged)
- Soft delete tenant

# Negative tests
- Create tenant with blank name (should fail)
- Create tenant with duplicate slug (should fail)
- Create tenant with invalid slug characters (should fail)
- Create tenant with name >100 chars (should fail)

# Edge cases
- Name with special characters generates valid slug
- Very long name generates truncated slug
- Slug conflicts resolved automatically
```

**Database Schema**:
```sql
CREATE TABLE tenants (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX index_tenants_on_status ON tenants(status);
CREATE INDEX index_tenants_on_deleted_at ON tenants(deleted_at);
```

---

#### CP-002: Create User Model (5 pts)

**Description**: Implement User model with authentication support using bcrypt.

**Technical Requirements**:
- Secure password hashing with bcrypt
- Email validation and uniqueness
- Role-based access (owner, admin, developer, viewer)
- Tenant association
- Last sign-in tracking
- Soft delete support

**Acceptance Criteria**:
- [ ] User table created with foreign key to tenants
- [ ] has_secure_password implemented
- [ ] Email validation (format and uniqueness)
- [ ] Password minimum length 8 characters
- [ ] Role validation (must be one of: owner, admin, developer, viewer)
- [ ] Role defaults to 'developer'
- [ ] last_sign_in_at updated on login
- [ ] Unit tests cover:
  - User creation with valid attributes
  - Password authentication
  - Invalid email formats
  - Duplicate emails
  - Password too short
  - Invalid roles
  - Permission methods (can_manage_users?, can_manage_billing?)
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Authentication tests
- User can be created with valid password
- User can authenticate with correct password
- User cannot authenticate with wrong password
- Password is hashed, not stored in plaintext

# Validation tests
- Valid email formats accepted
- Invalid email formats rejected
- Duplicate emails rejected (case insensitive)
- Password <8 chars rejected
- Invalid roles rejected

# Permission tests
- Owner can manage users and billing
- Admin can manage users but not billing
- Developer cannot manage users or billing
- Viewer has read-only access
```

**Database Schema**:
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_digest VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'developer',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  last_sign_in_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CHECK (role IN ('owner', 'admin', 'developer', 'viewer'))
);

CREATE INDEX index_users_on_tenant_id ON users(tenant_id);
CREATE INDEX index_users_on_email ON users(email);
CREATE INDEX index_users_on_role ON users(role);
CREATE INDEX index_users_on_deleted_at ON users(deleted_at);
```

---

#### CP-003: Create Product Model (3 pts)

**Description**: Implement Product model representing individual applications/projects within a tenant.

**Technical Requirements**:
- Unique API key ID per product
- Rate limiting support
- Status management
- JSONB settings for configuration
- Tenant association

**Acceptance Criteria**:
- [ ] Product table created with tenant foreign key
- [ ] api_key_id auto-generated with format: `prod_[32 hex chars]`
- [ ] api_key_id is unique across all products
- [ ] Name validation (2-100 characters)
- [ ] Status validation (active, paused, deleted)
- [ ] Rate limit validation (positive integer or null)
- [ ] rate_limit_exceeded? method works correctly
- [ ] Unit tests cover:
  - Product creation with auto-generated api_key_id
  - Custom api_key_id rejected if duplicate
  - Invalid status values
  - Rate limit checks
  - Tenant association
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Creation tests
- Product created with auto-generated api_key_id
- api_key_id has correct format (prod_[hex])
- api_key_id is unique

# Rate limiting tests
- Product with no rate_limit never exceeds limit
- Product with rate_limit=100 allows 99 sends
- Product with rate_limit=100 blocks 100th send
- Negative rate_limit rejected

# Status tests
- New product defaults to 'active'
- Status can be changed to 'paused'
- Invalid status rejected
```

**Database Schema**:
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  api_key_id VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  rate_limit INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CHECK (status IN ('active', 'paused', 'deleted')),
  CHECK (rate_limit IS NULL OR rate_limit > 0)
);

CREATE INDEX index_products_on_tenant_id ON products(tenant_id);
CREATE INDEX index_products_on_api_key_id ON products(api_key_id);
CREATE INDEX index_products_on_status ON products(status);
```

---

#### CP-004: Create ApiKey Model (5 pts)

**Description**: Implement API key model for authenticating API requests with secure hashing.

**Technical Requirements**:
- SHA-256 hashing for security
- Key prefix for identification (first 8 chars)
- Expiration support
- Revocation support
- Usage tracking (last_used_at)
- Format: `sk_[64 hex chars]`

**Acceptance Criteria**:
- [ ] ApiKey table created with foreign keys
- [ ] generate method creates secure API key
- [ ] Raw key returned only once on generation
- [ ] Key hash stored, raw key never stored
- [ ] Key prefix stored for identification
- [ ] authenticate method finds key by hash
- [ ] last_used_at updated on successful auth
- [ ] Expired keys not authenticated
- [ ] Revoked keys not authenticated
- [ ] Unit tests cover:
  - Key generation and format
  - Authentication with valid key
  - Authentication with invalid key
  - Authentication with expired key
  - Authentication with revoked key
  - last_used_at updates
  - Revocation
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Generation tests
- Generated key has format sk_[64 hex chars]
- Raw key returned only on generation
- Key hash stored correctly
- Key prefix matches first 8 chars

# Authentication tests
- Valid key authenticates successfully
- Invalid key returns nil
- Expired key returns nil
- Revoked key returns nil
- last_used_at updated on auth

# Security tests
- Raw key never stored in database
- Key hash uses SHA-256
- Different keys produce different hashes
- Same key produces same hash
```

**Database Schema**:
```sql
CREATE TABLE api_keys (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX index_api_keys_on_product_id ON api_keys(product_id);
CREATE INDEX index_api_keys_on_user_id ON api_keys(user_id);
CREATE INDEX index_api_keys_on_key_hash ON api_keys(key_hash);
```

---

#### CP-005: Create ProviderAccount Model (8 pts)

**Description**: Implement provider account model with encrypted credentials storage.

**Technical Requirements**:
- Lockbox encryption for credentials
- Support for multiple providers (SendGrid, Mailgun, AWS SES, Postmark, Resend, SMTP)
- Credential validation per provider
- Health check tracking
- Status management

**Acceptance Criteria**:
- [ ] ProviderAccount table created with encryption
- [ ] Lockbox configured with master key from ENV
- [ ] Credentials encrypted at rest
- [ ] Credentials never logged or exposed
- [ ] Provider validation (must be in supported list)
- [ ] validate_credentials! checks provider-specific requirements
- [ ] Health check tracking (last_health_check_at)
- [ ] healthy? method checks status and recent health check
- [ ] Unit tests cover:
  - Provider account creation
  - Credential encryption/decryption
  - Provider validation
  - Credential validation per provider type
  - Health check logic
  - Active scope
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Encryption tests
- Credentials encrypted in database
- Credentials decrypted correctly when accessed
- Credentials not visible in logs
- Master key required for decryption

# Provider validation tests
- Valid provider names accepted
- Invalid provider names rejected
- Each supported provider type works

# Credential validation tests
- SendGrid requires api_key
- AWS SES requires access_key_id and secret_access_key
- Mailgun requires api_key and domain
- SMTP requires host, port, username, password
- Missing credentials raise ArgumentError

# Health check tests
- Provider with recent health check is healthy
- Provider with old health check is unhealthy
- Inactive provider is unhealthy
```

**Database Schema**:
```sql
CREATE TABLE provider_accounts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  credentials_ciphertext TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_health_check_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CHECK (provider IN ('sendgrid', 'mailgun', 'aws_ses', 'postmark', 'resend', 'smtp')),
  CHECK (status IN ('active', 'inactive', 'error'))
);

CREATE INDEX index_provider_accounts_on_tenant_id ON provider_accounts(tenant_id);
CREATE INDEX index_provider_accounts_on_provider ON provider_accounts(provider);
CREATE INDEX index_provider_accounts_on_status ON provider_accounts(status);
```

---

### Epic 1.2: Authentication & Authorization

#### CP-010: Implement JWT Service (5 pts)

**Description**: Create service for generating and validating JWT tokens.

**Technical Requirements**:
- HS256 algorithm
- Configurable expiration (default 24 hours)
- Error handling for invalid/expired tokens
- Secret key from Rails credentials or ENV

**Acceptance Criteria**:
- [ ] JwtService class implemented
- [ ] encode method generates valid JWT
- [ ] decode method validates and decodes JWT
- [ ] Expired tokens return nil
- [ ] Invalid tokens return nil
- [ ] Token includes exp claim
- [ ] Secret key loaded from credentials or ENV
- [ ] Unit tests cover:
  - Token generation
  - Token validation
  - Expiration handling
  - Invalid token handling
  - Custom expiration times
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# Encoding tests
- Token generated with default expiration
- Token generated with custom expiration
- Token includes all payload fields
- Token includes exp claim

# Decoding tests
- Valid token decoded successfully
- Expired token returns nil
- Invalid signature returns nil
- Malformed token returns nil
- Token without exp claim rejected
```

---

#### CP-013: API Key Authentication Middleware (5 pts)

**Description**: Implement middleware to authenticate requests using API keys or JWT tokens.

**Technical Requirements**:
- Support both API key and JWT authentication
- Extract authentication from Authorization header
- Set current_user, current_tenant, current_product
- Return 401 for missing/invalid auth
- Update last_used_at for API keys

**Acceptance Criteria**:
- [ ] Authenticable concern created
- [ ] authenticate_request! checks for auth
- [ ] API key authentication works (Bearer sk_...)
- [ ] JWT authentication works (Bearer ey...)
- [ ] Missing auth returns 401
- [ ] Invalid auth returns 401
- [ ] current_user set for JWT auth
- [ ] current_product set for API key auth
- [ ] current_tenant set for both
- [ ] Unit tests cover:
  - Valid API key auth
  - Valid JWT auth
  - Missing auth
  - Invalid API key
  - Invalid JWT
  - Expired JWT
  - Revoked API key
- [ ] Integration tests with real requests
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# API Key auth tests
- Request with valid API key succeeds
- Request with invalid API key returns 401
- Request with revoked API key returns 401
- API key last_used_at updated

# JWT auth tests
- Request with valid JWT succeeds
- Request with invalid JWT returns 401
- Request with expired JWT returns 401
- User not found returns 401

# Missing auth tests
- Request without auth returns 401
- Request with malformed auth returns 401
```

---

### Epic 1.3: Go Provider System

#### GO-001: Implement AWS SES Provider (8 pts)

**Description**: Add real AWS SES integration for email sending.

**Technical Requirements**:
- AWS SDK v2 integration
- Support for HTML and text emails
- Proper error handling
- Health check implementation
- Credential management from environment

**Acceptance Criteria**:
- [ ] AWS SDK v2 dependencies added
- [ ] AWSSESProvider struct implemented
- [ ] Send method sends emails via SES
- [ ] HTML and text body support
- [ ] CC and BCC support
- [ ] Custom headers support
- [ ] Error handling with proper types
- [ ] HealthCheck verifies credentials
- [ ] Unit tests cover:
  - Successful send
  - Send with text body only
  - Send with HTML body
  - Send failure handling
  - Health check success
  - Health check failure
  - Invalid credentials
- [ ] Integration tests with real SES (sandbox)
- [ ] Code coverage >80%

**Test Scenarios**:
```go
// Positive tests
- Send simple email successfully
- Send email with HTML body
- Send email with text body
- Send email with both HTML and text
- Send email with attachments
- Health check with valid credentials

// Negative tests
- Send with invalid credentials returns error
- Send with invalid email format returns error
- Send to unverified email (sandbox) returns error
- Health check with invalid credentials fails

// Edge cases
- Send with very long subject
- Send with large body
- Send with special characters
- Concurrent sends
```

---

#### GO-002: Implement SMTP Provider with Pooling (5 pts)

**Description**: Add SMTP provider with connection pooling for performance.

**Technical Requirements**:
- Connection pool management
- TLS support
- Authentication support
- Configurable pool size
- Connection health checks

**Acceptance Criteria**:
- [ ] SMTPProvider struct implemented
- [ ] Connection pool created
- [ ] Pool pre-warmed with connections
- [ ] Send method reuses connections from pool
- [ ] TLS enabled for security
- [ ] PLAIN authentication supported
- [ ] Pool size configurable
- [ ] Stale connections detected and replaced
- [ ] Unit tests cover:
  - Pool initialization
  - Connection reuse
  - Concurrent sends
  - Pool exhaustion handling
  - Connection errors
  - Health check
- [ ] Load tests verify pooling benefits
- [ ] Code coverage >80%

**Test Scenarios**:
```go
// Pool tests
- Pool initialized with correct size
- Connections reused from pool
- Pool handles concurrent requests
- Pool blocks when exhausted
- Stale connections removed

// Send tests
- Send email successfully
- Send with TLS
- Send with authentication
- Send failure returns error
- Connection error handled

// Performance tests
- 100 concurrent sends complete
- Pool reduces connection overhead
- No connection leaks
```

---

## Milestone 2: Core Features & API Development

### Epic 2.1: Rails API Endpoints

#### CP-020: Create Product CRUD Endpoints (5 pts)

**Description**: RESTful API endpoints for product management.

**Technical Requirements**:
- Standard REST endpoints (index, show, create, update, destroy)
- Tenant scoping (users only see their tenant's products)
- Input validation
- Proper error responses
- JSON API format

**Acceptance Criteria**:
- [ ] ProductsController created
- [ ] GET /api/v1/products - list products
- [ ] GET /api/v1/products/:id - show product
- [ ] POST /api/v1/products - create product
- [ ] PATCH /api/v1/products/:id - update product
- [ ] DELETE /api/v1/products/:id - destroy product
- [ ] Responses use ProductSerializer
- [ ] Tenant scoping enforced
- [ ] Input validation (name, rate_limit)
- [ ] Proper HTTP status codes
- [ ] Error messages in consistent format
- [ ] Integration tests cover:
  - CRUD operations
  - Tenant isolation
  - Validation errors
  - Authentication required
  - Authorization checks
- [ ] API documentation generated
- [ ] Code coverage >90%

**Test Scenarios**:
```ruby
# CRUD tests
- User can list their products
- User can view product details
- User can create product
- User can update product
- User can delete product

# Tenant isolation tests
- User cannot access other tenant's products
- Product list filtered by tenant
- Product show returns 404 for other tenants

# Validation tests
- Create product with blank name fails
- Create product with negative rate_limit fails
- Update with invalid data fails

# Authorization tests
- Unauthenticated request returns 401
- Developer cannot delete products
- Admin can manage products
```

**API Documentation**:
```yaml
/api/v1/products:
  get:
    summary: List products
    responses:
      200:
        description: List of products
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Product'
  post:
    summary: Create product
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              name:
                type: string
              rate_limit:
                type: integer
    responses:
      201:
        description: Product created
      422:
        description: Validation error
```

---

## Testing Requirements

### Unit Testing

**Requirements**:
- All models have unit tests
- All services have unit tests
- Test coverage >80% for non-critical, >90% for critical paths
- Use factories for test data (FactoryBot)
- Test both positive and negative cases
- Test edge cases

**Example Structure**:
```ruby
RSpec.describe Tenant, type: :model do
  describe 'validations' do
    # Test all validations
  end

  describe 'associations' do
    # Test all associations
  end

  describe 'callbacks' do
    # Test callbacks
  end

  describe 'scopes' do
    # Test all scopes
  end

  describe 'instance methods' do
    # Test all public methods
  end
end
```

### Integration Testing

**Requirements**:
- Test full request/response cycle
- Test authentication and authorization
- Test API endpoints end-to-end
- Test error handling
- Test data persistence

**Example Structure**:
```ruby
RSpec.describe 'Products API', type: :request do
  let(:tenant) { create(:tenant) }
  let(:user) { create(:user, tenant: tenant) }
  let(:token) { JwtService.encode(user_id: user.id, tenant_id: tenant.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token}" } }

  describe 'GET /api/v1/products' do
    it 'returns products for authenticated user' do
      create_list(:product, 3, tenant: tenant)
      get '/api/v1/products', headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['data'].length).to eq(3)
    end
  end
end
```

### End-to-End Testing

**Requirements**:
- Test complete user journeys
- Test across multiple services
- Test email sending pipeline
- Test webhook processing
- Use real (or realistic) data

**Example Scenarios**:
```gherkin
Feature: Email Sending
  Scenario: User sends email through API
    Given I have a valid API key
    And I have configured SendGrid provider
    When I send an email via API
    Then the email is queued
    And the Go Core processes the email
    And the provider sends the email
    And a webhook confirms delivery
    And the message status updates to "delivered"
```

---

## Performance Requirements

### Response Times

- API endpoints: <200ms (p95)
- Email sending: <500ms (p95)
- Webhook processing: <100ms (p95)
- Database queries: <50ms (p95)

### Throughput

- API: 1000 requests/second
- Email sending: 500 emails/second
- Webhook processing: 1000 events/second

### Scalability

- Horizontal scaling supported
- Stateless services
- Database connection pooling
- Redis for caching and queues

---

## Security Requirements

### Authentication

- JWT tokens expire after 24 hours
- API keys hashed with SHA-256
- Passwords hashed with bcrypt (cost 12)
- No plaintext secrets in database

### Authorization

- Role-based access control enforced
- Tenant isolation enforced
- No cross-tenant data access

### Data Protection

- Credentials encrypted at rest (Lockbox)
- TLS required for all connections
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection enabled

---

## Deployment Requirements

### Environment Variables

Required for all environments:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SECRET_KEY_BASE`
- `GO_CORE_SECRET`

### Health Checks

All services must expose `/health` endpoint:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### Monitoring

- Prometheus metrics exported
- Structured logging (JSON)
- Error tracking (Sentry)
- Performance monitoring (APM)

---

## Documentation Requirements

Each feature must include:
- [ ] Code comments for complex logic
- [ ] API documentation (OpenAPI)
- [ ] README updates if needed
- [ ] CHANGELOG entry
- [ ] Migration guide if breaking change

---

## Definition of Ready

Before starting a story, ensure:
- [ ] Acceptance criteria are clear
- [ ] Dependencies are resolved
- [ ] Design is approved
- [ ] Test strategy defined
- [ ] Technical approach agreed

## Definition of Done

A story is complete when:
- [ ] Code written and reviewed
- [ ] Tests written and passing (>80% coverage)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Deployed to staging
- [ ] Product owner approved
