# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Tenant, type: :model do
  describe 'validations' do
    subject { build(:tenant) }

    it { should validate_presence_of(:name) }
    it { should validate_uniqueness_of(:slug) }

    it 'validates slug presence when slug cannot be auto-generated' do
      tenant = build(:tenant, name: nil, slug: nil)
      expect(tenant).not_to be_valid
      expect(tenant.errors[:name]).to be_present
    end
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email) }
    it { should validate_presence_of(:mode) }
    it { should validate_inclusion_of(:mode).in_array(%w[demo byok managed]) }
    it { should validate_presence_of(:status) }
    it { should validate_inclusion_of(:status).in_array(%w[active suspended pending_compliance]) }

    it 'validates password length on create' do
      tenant = build(:tenant, password: 'short')
      expect(tenant).not_to be_valid
      expect(tenant.errors[:password]).to be_present
    end

    context 'when slug contains invalid characters' do
      it 'is invalid with spaces and special characters' do
        tenant = build(:tenant, slug: 'invalid slug!')
        expect(tenant).not_to be_valid
        expect(tenant.errors[:slug]).to include('only lowercase letters, numbers, and hyphens')
      end
    end

    context 'when slug contains uppercase characters' do
      it 'is invalid' do
        tenant = build(:tenant, slug: 'Invalid')
        expect(tenant).not_to be_valid
        expect(tenant.errors[:slug]).to be_present
      end
    end
  end

  describe 'associations' do
    it { should have_many(:api_keys).dependent(:destroy) }
    it { should have_many(:provider_connections).dependent(:destroy) }
    it { should have_many(:domains).dependent(:destroy) }
    it { should have_many(:routing_rules).dependent(:destroy) }
    it { should have_many(:suppressions).dependent(:destroy) }
    it { should have_many(:emails).dependent(:destroy) }
    it { should have_many(:webhook_endpoints).dependent(:destroy) }
    it { should have_many(:mcp_connections).dependent(:destroy) }
    it { should have_many(:usage_stats).dependent(:destroy) }
    it { should have_one(:rate_limit_policy).dependent(:destroy) }
  end

  describe 'slug auto-generation' do
    it 'generates slug from name when slug is not provided' do
      tenant = create(:tenant, name: 'Test Company', slug: nil)
      expect(tenant.slug).to eq('test-company')
    end

    it 'does not overwrite an explicitly provided slug' do
      tenant = create(:tenant, name: 'Test Company', slug: 'custom-slug')
      expect(tenant.slug).to eq('custom-slug')
    end

    it 'generates a unique slug when there is a collision' do
      create(:tenant, name: 'Duplicate', slug: 'duplicate')
      tenant = create(:tenant, name: 'Duplicate', slug: nil)
      expect(tenant.slug).to start_with('duplicate-')
      expect(tenant.slug).not_to eq('duplicate')
    end
  end

  describe 'scopes' do
    describe '.active' do
      it 'returns only active tenants' do
        active_tenant = create(:tenant, status: 'active')
        create(:tenant, status: 'suspended')

        expect(Tenant.active).to contain_exactly(active_tenant)
      end
    end

    describe '.demo' do
      it 'returns only demo mode tenants' do
        demo_tenant = create(:tenant, mode: 'demo')
        create(:tenant, mode: 'byok')

        expect(Tenant.demo).to contain_exactly(demo_tenant)
      end
    end

    describe '.managed' do
      it 'returns only managed mode tenants' do
        managed_tenant = create(:tenant, mode: 'managed')
        create(:tenant, mode: 'demo')

        expect(Tenant.managed).to contain_exactly(managed_tenant)
      end
    end
  end

  describe 'has_secure_password' do
    it 'authenticates with correct password' do
      tenant = create(:tenant, password: 'password123')
      expect(tenant.authenticate('password123')).to eq(tenant)
    end

    it 'rejects incorrect password' do
      tenant = create(:tenant, password: 'password123')
      expect(tenant.authenticate('wrong')).to be_falsey
    end
  end
end
