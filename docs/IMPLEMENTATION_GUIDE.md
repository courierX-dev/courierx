# CourierX Implementation Guide

This guide provides step-by-step instructions for implementing the features outlined in `MILESTONES.md`.

> **Architecture Note**: CourierX uses a modern, decoupled architecture:
> - **Rails**: API-only mode (no views, no asset pipeline) - handles business logic, database, auth
> - **Next.js**: Separate dashboard app (TypeScript) - connects to Rails via REST API
> - **Go**: Standalone email engine - communicates with Rails via HTTP
>
> This separation maximizes hiring flexibility and uses industry-standard technologies.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Epic 1.1: Rails Core Models](#epic-11-rails-core-models)
3. [Epic 1.2: Authentication & Authorization](#epic-12-authentication--authorization)
4. [Epic 1.3: Go Provider System](#epic-13-go-provider-system)
5. [Epic 2.1: Rails API Endpoints](#epic-21-rails-api-endpoints)
6. [Epic 2.2: Email Sending Pipeline](#epic-22-email-sending-pipeline)
7. [Epic 4.1: Next.js Dashboard](#epic-41-nextjs-dashboard)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Ruby 3.2+
- Rails 7.1+
- Go 1.21+
- Node.js 20+ (for Next.js dashboard)
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd courierx

# Run the setup script
./infra/scripts/setup-dev.sh

# Verify services are running
docker-compose -f infra/docker-compose.yml ps
```

### Project Structure

```
courierx/
├── apps/
│   ├── core-go/           # Go email sending engine
│   └── dashboard/         # Next.js dashboard (Milestone 4)
├── control-plane/         # Rails API (API-only, no views)
├── infra/                 # Infrastructure & deployment
│   ├── docker/           # Dockerfiles
│   ├── kubernetes/       # K8s manifests
│   └── scripts/          # Deployment scripts
└── docs/                 # Documentation
```

**Rails API-Only Setup:**
When creating the Rails app, use API-only mode:
```bash
rails new control-plane --api --database=postgresql
```

This generates a minimal Rails app without:
- Views, helpers, assets
- Asset pipeline
- JavaScript compilation
- Cookies/sessions middleware (add back for JWT later)

---

## Epic 1.1: Rails Core Models

### Story CP-001: Create Tenant Model

**Goal**: Create the Tenant model to represent organizations/teams.

**Steps**:

1. Generate the model:
```bash
cd control-plane
rails generate model Tenant \
  name:string \
  slug:string:uniq \
  status:string \
  settings:jsonb \
  deleted_at:datetime
```

2. Add validations and methods:
```ruby
# app/models/tenant.rb
class Tenant < ApplicationRecord
  # Associations
  has_many :users, dependent: :destroy
  has_many :products, dependent: :destroy
  has_many :provider_accounts, dependent: :destroy

  # Validations
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :slug, presence: true, uniqueness: true,
            format: { with: /\A[a-z0-9-]+\z/, message: "only lowercase letters, numbers, and hyphens" }
  validates :status, inclusion: { in: %w[active suspended deleted] }

  # Callbacks
  before_validation :generate_slug, on: :create

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :not_deleted, -> { where(deleted_at: nil) }

  # Soft delete
  def soft_delete
    update(status: 'deleted', deleted_at: Time.current)
  end

  private

  def generate_slug
    self.slug ||= name.parameterize if name.present?
  end
end
```

3. Create migration:
```ruby
# db/migrate/XXXXXX_create_tenants.rb
class CreateTenants < ActiveRecord::Migration[7.1]
  def change
    create_table :tenants do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.string :status, null: false, default: 'active'
      t.jsonb :settings, default: {}
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :tenants, :status
    add_index :tenants, :deleted_at
  end
end
```

4. Run migration and test:
```bash
rails db:migrate
rails console

# Test in console
tenant = Tenant.create!(name: "Test Company")
tenant.slug # => "test-company"
tenant.active? # => true
```

5. Write tests:
```ruby
# spec/models/tenant_spec.rb
require 'rails_helper'

RSpec.describe Tenant, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:slug) }
    it { should validate_uniqueness_of(:slug) }
  end

  describe 'associations' do
    it { should have_many(:users) }
    it { should have_many(:products) }
  end

  describe '#generate_slug' do
    it 'generates slug from name' do
      tenant = Tenant.create!(name: "My Company")
      expect(tenant.slug).to eq("my-company")
    end
  end

  describe '#soft_delete' do
    it 'marks tenant as deleted' do
      tenant = create(:tenant)
      tenant.soft_delete
      expect(tenant.status).to eq('deleted')
      expect(tenant.deleted_at).to be_present
    end
  end
end
```

### Story CP-002: Create User Model

**Goal**: Create User model with authentication support.

**Steps**:

1. Add gem to Gemfile:
```ruby
gem 'bcrypt', '~> 3.1.7'
gem 'jwt'
```

2. Generate model:
```bash
rails generate model User \
  tenant:references \
  email:string:uniq \
  password_digest:string \
  role:string \
  first_name:string \
  last_name:string \
  last_sign_in_at:datetime \
  deleted_at:datetime
```

3. Implement User model:
```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_password

  # Associations
  belongs_to :tenant
  has_many :api_keys, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: %w[owner admin developer viewer] }
  validates :password, length: { minimum: 8 }, if: -> { password.present? }

  # Scopes
  scope :active, -> { where(deleted_at: nil) }
  scope :by_role, ->(role) { where(role: role) }

  # Full name
  def full_name
    "#{first_name} #{last_name}".strip
  end

  # Check permissions
  def can_manage_users?
    %w[owner admin].include?(role)
  end

  def can_manage_billing?
    role == 'owner'
  end
end
```

4. Create migration:
```ruby
# db/migrate/XXXXXX_create_users.rb
class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.references :tenant, null: false, foreign_key: true
      t.string :email, null: false, index: { unique: true }
      t.string :password_digest, null: false
      t.string :role, null: false, default: 'developer'
      t.string :first_name
      t.string :last_name
      t.datetime :last_sign_in_at
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :users, :role
    add_index :users, :deleted_at
  end
end
```

### Story CP-003: Create Product Model

**Goal**: Products represent individual applications/projects within a tenant.

**Steps**:

1. Generate model:
```bash
rails generate model Product \
  tenant:references \
  name:string \
  api_key_id:string:uniq \
  status:string \
  settings:jsonb \
  rate_limit:integer
```

2. Implement Product model:
```ruby
# app/models/product.rb
class Product < ApplicationRecord
  # Associations
  belongs_to :tenant
  has_many :api_keys, dependent: :destroy
  has_many :routes, dependent: :destroy
  has_many :messages, dependent: :destroy
  has_many :templates, dependent: :destroy

  # Validations
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :api_key_id, presence: true, uniqueness: true
  validates :status, inclusion: { in: %w[active paused deleted] }
  validates :rate_limit, numericality: { greater_than: 0 }, allow_nil: true

  # Callbacks
  before_validation :generate_api_key_id, on: :create

  # Scopes
  scope :active, -> { where(status: 'active') }

  # Check rate limit
  def rate_limit_exceeded?(count)
    rate_limit.present? && count >= rate_limit
  end

  private

  def generate_api_key_id
    self.api_key_id ||= "prod_#{SecureRandom.hex(16)}"
  end
end
```

### Story CP-004: Create ApiKey Model

**Goal**: API keys for authenticating API requests.

**Steps**:

1. Generate model:
```bash
rails generate model ApiKey \
  product:references \
  user:references \
  name:string \
  key_hash:string \
  key_prefix:string \
  last_used_at:datetime \
  expires_at:datetime \
  revoked_at:datetime
```

2. Implement ApiKey model:
```ruby
# app/models/api_key.rb
class ApiKey < ApplicationRecord
  # Associations
  belongs_to :product
  belongs_to :user

  # Validations
  validates :name, presence: true
  validates :key_hash, presence: true, uniqueness: true
  validates :key_prefix, presence: true

  # Scopes
  scope :active, -> { where(revoked_at: nil).where('expires_at IS NULL OR expires_at > ?', Time.current) }

  # Generate API key
  def self.generate(product:, user:, name:, expires_at: nil)
    raw_key = "sk_#{SecureRandom.hex(32)}"
    key_hash = Digest::SHA256.hexdigest(raw_key)
    key_prefix = raw_key[0..7]

    api_key = create!(
      product: product,
      user: user,
      name: name,
      key_hash: key_hash,
      key_prefix: key_prefix,
      expires_at: expires_at
    )

    [api_key, raw_key] # Return both; raw_key shown only once
  end

  # Authenticate
  def self.authenticate(raw_key)
    key_hash = Digest::SHA256.hexdigest(raw_key)
    api_key = active.find_by(key_hash: key_hash)
    api_key&.touch(:last_used_at)
    api_key
  end

  # Revoke
  def revoke!
    update!(revoked_at: Time.current)
  end

  def active?
    revoked_at.nil? && (expires_at.nil? || expires_at > Time.current)
  end
end
```

### Story CP-005: Create ProviderAccount Model

**Goal**: Store encrypted provider credentials.

**Steps**:

1. Add encryption gem:
```ruby
# Gemfile
gem 'lockbox'
gem 'blind_index'
```

2. Generate model:
```bash
rails generate model ProviderAccount \
  tenant:references \
  provider:string \
  name:string \
  credentials_ciphertext:text \
  status:string \
  last_health_check_at:datetime
```

3. Implement with encryption:
```ruby
# app/models/provider_account.rb
class ProviderAccount < ApplicationRecord
  encrypts :credentials

  # Associations
  belongs_to :tenant
  has_many :routes, dependent: :destroy

  # Validations
  validates :provider, presence: true,
            inclusion: { in: %w[sendgrid mailgun aws_ses postmark resend smtp] }
  validates :name, presence: true
  validates :status, inclusion: { in: %w[active inactive error] }

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :by_provider, ->(provider) { where(provider: provider) }

  # Health check
  def healthy?
    status == 'active' && last_health_check_at && last_health_check_at > 5.minutes.ago
  end

  # Validate credentials format
  def validate_credentials!
    case provider
    when 'sendgrid'
      raise ArgumentError, "api_key required" unless credentials['api_key'].present?
    when 'aws_ses'
      raise ArgumentError, "access_key_id and secret_access_key required" unless
        credentials['access_key_id'].present? && credentials['secret_access_key'].present?
    # Add more provider validations
    end
  end
end
```

4. Configure Lockbox:
```ruby
# config/initializers/lockbox.rb
Lockbox.master_key = ENV['ENCRYPTION_KEY']
```

### Story CP-006: Create Route Model

**Goal**: Configure provider failover and routing rules.

**Steps**:

1. Generate model:
```bash
rails generate model Route \
  product:references \
  name:string \
  priority:integer \
  status:string \
  conditions:jsonb \
  provider_configs:jsonb
```

2. Implement Route model:
```ruby
# app/models/route.rb
class Route < ApplicationRecord
  # Associations
  belongs_to :product
  has_many :route_providers, dependent: :destroy
  has_many :provider_accounts, through: :route_providers

  # Validations
  validates :name, presence: true
  validates :priority, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :status, inclusion: { in: %w[active inactive] }

  # Scopes
  scope :active, -> { where(status: 'active').order(priority: :asc) }

  # Check if route matches conditions
  def matches?(email_request)
    return true if conditions.blank?

    conditions.all? do |key, value|
      case key
      when 'from_domain'
        email_request[:from].end_with?("@#{value}")
      when 'tags'
        (email_request[:tags] & value).any?
      when 'volume'
        email_request[:volume] <= value
      else
        true
      end
    end
  end
end

# Generate join table
rails generate model RouteProvider \
  route:references \
  provider_account:references \
  priority:integer \
  weight:integer
```

### Story CP-007: Create Message Model

**Goal**: Track all sent emails.

**Steps**:

1. Generate model:
```bash
rails generate model Message \
  product:references \
  provider_account:references \
  external_id:string:uniq \
  from_email:string \
  to_email:string \
  subject:string \
  status:string \
  metadata:jsonb \
  sent_at:datetime \
  delivered_at:datetime \
  failed_at:datetime \
  error_message:text
```

2. Implement Message model:
```ruby
# app/models/message.rb
class Message < ApplicationRecord
  # Associations
  belongs_to :product
  belongs_to :provider_account
  has_many :events, dependent: :destroy

  # Validations
  validates :external_id, presence: true, uniqueness: true
  validates :from_email, :to_email, presence: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :status, inclusion: {
    in: %w[queued sent delivered bounced complained failed]
  }

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :by_status, ->(status) { where(status: status) }
  scope :in_date_range, ->(start_date, end_date) {
    where(created_at: start_date..end_date)
  }

  # State transitions
  def mark_sent!
    update!(status: 'sent', sent_at: Time.current)
  end

  def mark_delivered!
    update!(status: 'delivered', delivered_at: Time.current)
  end

  def mark_failed!(error)
    update!(
      status: 'failed',
      failed_at: Time.current,
      error_message: error
    )
  end
end
```

### Story CP-008: Create Event Model

**Goal**: Track email delivery events (opens, clicks, bounces).

**Steps**:

1. Generate model:
```bash
rails generate model Event \
  message:references \
  event_type:string \
  data:jsonb \
  occurred_at:datetime
```

2. Implement Event model:
```ruby
# app/models/event.rb
class Event < ApplicationRecord
  # Associations
  belongs_to :message

  # Validations
  validates :event_type, presence: true,
            inclusion: { in: %w[sent delivered bounced opened clicked complained unsubscribed] }
  validates :occurred_at, presence: true

  # Scopes
  scope :recent, -> { order(occurred_at: :desc) }
  scope :by_type, ->(type) { where(event_type: type) }

  # After create callback to update message
  after_create :update_message_status

  private

  def update_message_status
    case event_type
    when 'delivered'
      message.mark_delivered!
    when 'bounced', 'complained'
      message.update(status: event_type)
    end
  end
end
```

### Story CP-009: Create Template Model

**Goal**: Email template management.

**Steps**:

1. Generate model:
```bash
rails generate model Template \
  product:references \
  name:string \
  slug:string \
  subject:string \
  html_content:text \
  text_content:text \
  variables:jsonb \
  status:string
```

2. Implement Template model:
```ruby
# app/models/template.rb
class Template < ApplicationRecord
  # Associations
  belongs_to :product

  # Validations
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { scope: :product_id }
  validates :subject, presence: true
  validates :html_content, presence: true
  validates :status, inclusion: { in: %w[draft active archived] }

  # Callbacks
  before_validation :generate_slug, on: :create

  # Scopes
  scope :active, -> { where(status: 'active') }

  # Render template with variables
  def render(variables = {})
    rendered_subject = interpolate(subject, variables)
    rendered_html = interpolate(html_content, variables)
    rendered_text = text_content.present? ? interpolate(text_content, variables) : nil

    {
      subject: rendered_subject,
      html: rendered_html,
      text: rendered_text
    }
  end

  private

  def generate_slug
    self.slug ||= name.parameterize if name.present?
  end

  def interpolate(content, vars)
    result = content.dup
    vars.each do |key, value|
      result.gsub!("{{#{key}}}", value.to_s)
    end
    result
  end
end
```

---

## Epic 1.2: Authentication & Authorization

### Story CP-010: Implement JWT Service

**Goal**: Create service for JWT token generation and validation.

**Steps**:

1. Create JWT service:
```ruby
# app/services/jwt_service.rb
class JwtService
  SECRET_KEY = Rails.application.credentials.jwt_secret || ENV['JWT_SECRET']
  ALGORITHM = 'HS256'

  def self.encode(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY, ALGORITHM)
  end

  def self.decode(token)
    body = JWT.decode(token, SECRET_KEY, true, { algorithm: ALGORITHM })[0]
    HashWithIndifferentAccess.new(body)
  rescue JWT::ExpiredSignature, JWT::DecodeError => e
    Rails.logger.error("JWT decode error: #{e.message}")
    nil
  end
end
```

2. Write tests:
```ruby
# spec/services/jwt_service_spec.rb
require 'rails_helper'

RSpec.describe JwtService do
  describe '.encode' do
    it 'encodes payload to JWT token' do
      payload = { user_id: 1, tenant_id: 1 }
      token = JwtService.encode(payload)
      expect(token).to be_present
      expect(token).to be_a(String)
    end
  end

  describe '.decode' do
    it 'decodes valid JWT token' do
      payload = { user_id: 1, tenant_id: 1 }
      token = JwtService.encode(payload)
      decoded = JwtService.decode(token)
      expect(decoded[:user_id]).to eq(1)
      expect(decoded[:tenant_id]).to eq(1)
    end

    it 'returns nil for invalid token' do
      decoded = JwtService.decode('invalid.token.here')
      expect(decoded).to be_nil
    end

    it 'returns nil for expired token' do
      payload = { user_id: 1 }
      token = JwtService.encode(payload, 1.second.ago)
      sleep 1
      decoded = JwtService.decode(token)
      expect(decoded).to be_nil
    end
  end
end
```

### Story CP-011 & CP-012: User Registration and Login

**Goal**: Create authentication endpoints.

**Steps**:

1. Create authentication controller:
```ruby
# app/controllers/api/v1/auth_controller.rb
module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: [:register, :login]

      # POST /api/v1/auth/register
      def register
        tenant = Tenant.create!(tenant_params)
        user = tenant.users.create!(user_params.merge(role: 'owner'))

        token = JwtService.encode(user_id: user.id, tenant_id: tenant.id)

        render json: {
          user: UserSerializer.new(user),
          tenant: TenantSerializer.new(tenant),
          token: token
        }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email])

        if user&.authenticate(params[:password])
          user.update(last_sign_in_at: Time.current)
          token = JwtService.encode(user_id: user.id, tenant_id: user.tenant_id)

          render json: {
            user: UserSerializer.new(user),
            tenant: TenantSerializer.new(user.tenant),
            token: token
          }
        else
          render json: { error: 'Invalid email or password' }, status: :unauthorized
        end
      end

      # POST /api/v1/auth/logout
      def logout
        # JWT is stateless, so logout is handled client-side
        head :no_content
      end

      # GET /api/v1/auth/me
      def me
        render json: {
          user: UserSerializer.new(current_user),
          tenant: TenantSerializer.new(current_user.tenant)
        }
      end

      private

      def tenant_params
        params.require(:tenant).permit(:name)
      end

      def user_params
        params.require(:user).permit(:email, :password, :first_name, :last_name)
      end
    end
  end
end
```

2. Add routes:
```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/register', to: 'auth#register'
      post 'auth/login', to: 'auth#login'
      post 'auth/logout', to: 'auth#logout'
      get 'auth/me', to: 'auth#me'
    end
  end
end
```

### Story CP-013: API Key Authentication Middleware

**Goal**: Authenticate requests using API keys.

**Steps**:

1. Create authentication concern:
```ruby
# app/controllers/concerns/authenticable.rb
module Authenticable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request!
  end

  private

  def authenticate_request!
    if api_key_present?
      authenticate_with_api_key!
    elsif jwt_present?
      authenticate_with_jwt!
    else
      render json: { error: 'Missing authentication' }, status: :unauthorized
    end
  end

  def authenticate_with_api_key!
    api_key = extract_api_key
    @current_api_key = ApiKey.authenticate(api_key)

    unless @current_api_key
      render json: { error: 'Invalid API key' }, status: :unauthorized
      return
    end

    @current_product = @current_api_key.product
    @current_tenant = @current_product.tenant
  end

  def authenticate_with_jwt!
    token = extract_jwt
    payload = JwtService.decode(token)

    unless payload
      render json: { error: 'Invalid token' }, status: :unauthorized
      return
    end

    @current_user = User.find_by(id: payload[:user_id])
    @current_tenant = @current_user&.tenant

    unless @current_user
      render json: { error: 'User not found' }, status: :unauthorized
    end
  end

  def api_key_present?
    request.headers['Authorization']&.start_with?('Bearer sk_')
  end

  def jwt_present?
    request.headers['Authorization']&.start_with?('Bearer ey')
  end

  def extract_api_key
    request.headers['Authorization']&.gsub(/^Bearer /, '')
  end

  def extract_jwt
    request.headers['Authorization']&.gsub(/^Bearer /, '')
  end

  attr_reader :current_user, :current_tenant, :current_product, :current_api_key
end
```

2. Include in ApplicationController:
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include Authenticable
end
```

### Story CP-014: Role-Based Access Control

**Goal**: Implement permission system based on user roles.

**Steps**:

1. Create authorization concern:
```ruby
# app/controllers/concerns/authorizable.rb
module Authorizable
  extend ActiveSupport::Concern

  class NotAuthorizedError < StandardError; end

  included do
    rescue_from NotAuthorizedError, with: :render_unauthorized
  end

  private

  def authorize_owner!
    raise NotAuthorizedError unless current_user&.role == 'owner'
  end

  def authorize_admin!
    raise NotAuthorizedError unless current_user&.can_manage_users?
  end

  def authorize_billing!
    raise NotAuthorizedError unless current_user&.can_manage_billing?
  end

  def render_unauthorized
    render json: { error: 'Not authorized' }, status: :forbidden
  end
end
```

2. Use in controllers:
```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      include Authorizable

      before_action :authorize_admin!, only: [:create, :update, :destroy]

      # ... controller actions
    end
  end
end
```

---

## Epic 1.3: Go Provider System Enhancement

### Story GO-001: Implement AWS SES Provider

**Goal**: Add real AWS SES email sending.

**Steps**:

1. Install AWS SDK:
```bash
cd apps/core-go
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/service/sesv2
```

2. Implement provider:
```go
// internal/providers/aws_ses.go
package providers

import (
    "context"
    "fmt"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/sesv2"
    "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type AWSSESProvider struct {
    client *sesv2.Client
    config ProviderConfig
}

func NewAWSSESProvider(cfg ProviderConfig) (*AWSSESProvider, error) {
    awsCfg, err := config.LoadDefaultConfig(context.Background(),
        config.WithRegion(cfg.Region),
        config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
            cfg.AccessKeyID,
            cfg.SecretAccessKey,
            "",
        )),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    client := sesv2.NewFromConfig(awsCfg)

    return &AWSSESProvider{
        client: client,
        config: cfg,
    }, nil
}

func (p *AWSSESProvider) Send(ctx context.Context, email *Email) (*SendResult, error) {
    input := &sesv2.SendEmailInput{
        FromEmailAddress: &email.From,
        Destination: &types.Destination{
            ToAddresses: []string{email.To},
        },
        Content: &types.EmailContent{
            Simple: &types.Message{
                Subject: &types.Content{
                    Data: &email.Subject,
                },
                Body: &types.Body{
                    Html: &types.Content{
                        Data: &email.HTMLBody,
                    },
                },
            },
        },
    }

    if email.TextBody != "" {
        input.Content.Simple.Body.Text = &types.Content{
            Data: &email.TextBody,
        }
    }

    result, err := p.client.SendEmail(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("SES send failed: %w", err)
    }

    return &SendResult{
        MessageID: *result.MessageId,
        Provider:  "aws_ses",
        Success:   true,
    }, nil
}

func (p *AWSSESProvider) HealthCheck(ctx context.Context) error {
    // Try to get send quota to verify credentials
    _, err := p.client.GetAccount(ctx, &sesv2.GetAccountInput{})
    return err
}

func (p *AWSSESProvider) Name() string {
    return "aws_ses"
}
```

### Story GO-002: Implement SMTP Provider with Pooling

**Goal**: Add SMTP provider with connection pooling.

**Steps**:

1. Implement SMTP provider:
```go
// internal/providers/smtp.go
package providers

import (
    "context"
    "crypto/tls"
    "fmt"
    "net/smtp"
    "sync"
    "time"
)

type SMTPProvider struct {
    config ProviderConfig
    pool   *smtp.ConnectionPool
}

type smtp.ConnectionPool struct {
    connections chan *smtp.Client
    mu          sync.Mutex
    host        string
    port        string
    username    string
    password    string
    maxConns    int
}

func NewSMTPProvider(cfg ProviderConfig) (*SMTPProvider, error) {
    pool := &smtp.ConnectionPool{
        connections: make(chan *smtp.Client, cfg.MaxConnections),
        host:        cfg.Host,
        port:        cfg.Port,
        username:    cfg.Username,
        password:    cfg.Password,
        maxConns:    cfg.MaxConnections,
    }

    // Pre-create connections
    for i := 0; i < cfg.MaxConnections; i++ {
        conn, err := pool.createConnection()
        if err != nil {
            return nil, fmt.Errorf("failed to create SMTP connection: %w", err)
        }
        pool.connections <- conn
    }

    return &SMTPProvider{
        config: cfg,
        pool:   pool,
    }, nil
}

func (p *smtp.ConnectionPool) createConnection() (*smtp.Client, error) {
    addr := fmt.Sprintf("%s:%s", p.host, p.port)

    conn, err := smtp.Dial(addr)
    if err != nil {
        return nil, err
    }

    // Start TLS
    if err := conn.StartTLS(&tls.Config{ServerName: p.host}); err != nil {
        conn.Close()
        return nil, err
    }

    // Authenticate
    auth := smtp.PlainAuth("", p.username, p.password, p.host)
    if err := conn.Auth(auth); err != nil {
        conn.Close()
        return nil, err
    }

    return conn, nil
}

func (p *SMTPProvider) Send(ctx context.Context, email *Email) (*SendResult, error) {
    // Get connection from pool
    var conn *smtp.Client
    select {
    case conn = <-p.pool.connections:
    case <-ctx.Done():
        return nil, ctx.Err()
    case <-time.After(5 * time.Second):
        return nil, fmt.Errorf("connection pool timeout")
    }

    defer func() {
        // Return connection to pool
        p.pool.connections <- conn
    }()

    // Send email
    if err := conn.Mail(email.From); err != nil {
        return nil, err
    }

    if err := conn.Rcpt(email.To); err != nil {
        return nil, err
    }

    wc, err := conn.Data()
    if err != nil {
        return nil, err
    }
    defer wc.Close()

    // Write email message
    message := fmt.Sprintf(
        "From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
        email.From, email.To, email.Subject, email.HTMLBody,
    )

    if _, err := wc.Write([]byte(message)); err != nil {
        return nil, err
    }

    messageID := fmt.Sprintf("<%d@%s>", time.Now().UnixNano(), p.config.Host)

    return &SendResult{
        MessageID: messageID,
        Provider:  "smtp",
        Success:   true,
    }, nil
}
```

---

## Epic 4.1: Next.js Dashboard

### Overview

The Next.js dashboard provides a modern, responsive UI for managing CourierX. It communicates with the Rails API via REST and provides real-time updates for email delivery tracking.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- shadcn/ui + Tailwind CSS
- React Query for data fetching
- Zustand for state management
- Recharts for analytics

### Story FE-001: Set up Next.js with TypeScript

**Goal**: Bootstrap the Next.js application with proper configuration.

**Steps**:

1. Create the Next.js app:
```bash
cd apps
npx create-next-app@latest dashboard \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"
```

2. Install additional dependencies:
```bash
cd dashboard
npm install @tanstack/react-query zustand axios zod
npm install -D @types/node
```

3. Configure environment variables:
```bash
# apps/dashboard/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

4. Set up TypeScript strict mode:
```json
// apps/dashboard/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

5. Create API client:
```typescript
// apps/dashboard/src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### Story FE-002: Install shadcn/ui Components

**Goal**: Set up the UI component library.

**Steps**:

1. Initialize shadcn/ui:
```bash
npx shadcn-ui@latest init
```

2. Install commonly used components:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
```

3. Create layout component:
```typescript
// apps/dashboard/src/components/layout/dashboard-layout.tsx
import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Story FE-003: Create Authentication Flow

**Goal**: Implement login, signup, and JWT token management.

**Steps**:

1. Create auth types:
```typescript
// apps/dashboard/src/types/auth.ts
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  tenant: {
    name: string
  }
  user: {
    email: string
    password: string
    first_name: string
    last_name: string
  }
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    role: string
  }
  tenant: {
    id: string
    name: string
  }
  token: string
}
```

2. Create auth service:
```typescript
// apps/dashboard/src/services/auth.service.ts
import api from '@/lib/api'
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth'

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/login', data)
    const { token } = response.data
    localStorage.setItem('auth_token', token)
    return response.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/register', data)
    const { token } = response.data
    localStorage.setItem('auth_token', token)
    return response.data
  },

  async logout() {
    localStorage.removeItem('auth_token')
    await api.post('/api/v1/auth/logout')
  },

  async getCurrentUser(): Promise<AuthResponse> {
    const response = await api.get('/api/v1/auth/me')
    return response.data
  },
}
```

3. Create login page:
```typescript
// apps/dashboard/src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { authService } from '@/services/auth.service'
import { toast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await authService.login({ email, password })
      toast({ title: 'Welcome back!' })
      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Login to CourierX</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

### Story FE-004: Dashboard Homepage with Real-time Metrics

**Goal**: Create the main dashboard with analytics and charts.

**Steps**:

1. Install charting library:
```bash
npm install recharts
```

2. Create metrics types:
```typescript
// apps/dashboard/src/types/metrics.ts
export interface DashboardMetrics {
  total_sent: number
  total_delivered: number
  total_bounced: number
  total_opened: number
  delivery_rate: number
  open_rate: number
  recent_messages: Array<{
    id: string
    to: string
    subject: string
    status: string
    created_at: string
  }>
}
```

3. Create dashboard page:
```typescript
// apps/dashboard/src/app/dashboard/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import api from '@/lib/api'
import { DashboardMetrics } from '@/types/metrics'

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get<DashboardMetrics>('/api/v1/dashboard/metrics')
      return response.data
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Sent</p>
          <p className="text-3xl font-bold">{metrics?.total_sent}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-3xl font-bold">{metrics?.total_delivered}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Delivery Rate</p>
          <p className="text-3xl font-bold">
            {metrics?.delivery_rate.toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Open Rate</p>
          <p className="text-3xl font-bold">
            {metrics?.open_rate.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Messages</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-2">To</th>
              <th className="pb-2">Subject</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {metrics?.recent_messages.map((msg) => (
              <tr key={msg.id} className="border-b">
                <td className="py-2">{msg.to}</td>
                <td className="py-2">{msg.subject}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    msg.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    msg.status === 'bounced' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.status}
                  </span>
                </td>
                <td className="py-2">{new Date(msg.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
```

### Story FE-006: API Key Management UI

**Goal**: Create interface for managing API keys.

**Steps**:

1. Create API key types:
```typescript
// apps/dashboard/src/types/api-key.ts
export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  revoked_at: string | null
}

export interface CreateApiKeyRequest {
  name: string
  product_id: string
  expires_at?: string
}

export interface CreateApiKeyResponse {
  api_key: ApiKey
  raw_key: string // Only returned once!
}
```

2. Create API keys page:
```typescript
// apps/dashboard/src/app/dashboard/api-keys/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { ApiKey, CreateApiKeyResponse } from '@/types/api-key'

export default function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.get<{ data: ApiKey[] }>('/api/v1/api-keys')
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post<CreateApiKeyResponse>('/api/v1/api-keys', { name })
      return response.data
    },
    onSuccess: (data) => {
      setCreatedKey(data.raw_key)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowCreate(false)
      setNewKeyName('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/api-keys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Button onClick={() => setShowCreate(true)}>Create API Key</Button>
      </div>

      <Card className="p-6">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-2">Name</th>
              <th className="pb-2">Key Prefix</th>
              <th className="pb-2">Last Used</th>
              <th className="pb-2">Created</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys?.map((key) => (
              <tr key={key.id} className="border-b">
                <td className="py-2">{key.name}</td>
                <td className="py-2"><code>{key.key_prefix}...</code></td>
                <td className="py-2">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
                </td>
                <td className="py-2">{new Date(key.created_at).toLocaleDateString()}</td>
                <td className="py-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeMutation.mutate(key.id)}
                    disabled={!!key.revoked_at}
                  >
                    {key.revoked_at ? 'Revoked' : 'Revoke'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Production API Key"
              />
            </div>
            <Button
              onClick={() => createMutation.mutate(newKeyName)}
              disabled={!newKeyName || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-red-600">
              This is the only time you'll see this key. Copy it now!
            </p>
            <code className="block p-4 bg-gray-100 rounded break-all">
              {createdKey}
            </code>
            <Button onClick={() => {
              navigator.clipboard.writeText(createdKey!)
            }}>
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Deployment

**Development:**
```bash
cd apps/dashboard
npm run dev  # Runs on http://localhost:3000
```

**Production:**
```bash
# Build
npm run build

# Start
npm start

# Or use Docker
docker build -t courierx-dashboard .
docker run -p 3000:3000 courierx-dashboard
```

**Environment Variables (Production):**
```bash
NEXT_PUBLIC_API_URL=https://api.courierx.com
NEXT_PUBLIC_WS_URL=wss://api.courierx.com
```

---

## Best Practices

### Code Quality

1. **Follow style guides**:
   - Ruby: Use Rubocop with standard config
   - Go: Use gofmt, golint, and go vet

2. **Write tests first (TDD)**:
   - Write failing test
   - Implement feature
   - Refactor

3. **Code coverage**:
   - Maintain >80% coverage for critical paths
   - Use SimpleCov for Ruby, go test -cover for Go

### Security

1. **Never commit secrets**:
   - Use environment variables
   - Use Rails credentials for sensitive data

2. **Validate all inputs**:
   - Use strong parameters in Rails
   - Validate email formats, lengths, etc.

3. **Encrypt sensitive data**:
   - Use Lockbox for credentials
   - Hash API keys (SHA-256)
   - Use bcrypt for passwords

### Database

1. **Add indexes**:
   - Foreign keys always need indexes
   - Query frequently used columns

2. **Use transactions**:
   - Wrap related operations in transactions
   - Ensure data consistency

3. **Optimize queries**:
   - Use includes/joins to avoid N+1
   - Add database-level constraints

### Git Workflow

1. **Branch naming**:
   - `feature/CP-001-tenant-model`
   - `bugfix/fix-api-auth`
   - `refactor/optimize-queries`

2. **Commit messages**:
   ```
   feat(models): add Tenant model with validations

   - Add Tenant model with name, slug, status
   - Implement soft delete functionality
   - Add comprehensive tests

   Closes #CP-001
   ```

3. **Pull requests**:
   - Reference story number
   - Include test coverage
   - Add screenshots for UI changes

---

## Next Steps

1. Complete Epic 1.1 (Core Models)
2. Run all tests and ensure >80% coverage
3. Create migration scripts
4. Document API endpoints
5. Move to Epic 1.2 (Authentication)

For more details on specific stories, see `docs/STORY_DETAILS.md`.
For architecture decisions, see `docs/ARCHITECTURE.md`.
