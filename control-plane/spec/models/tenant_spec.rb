# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Tenant, type: :model do
  describe 'validations' do
    subject { build(:tenant) }

    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:slug) }
    it { should validate_uniqueness_of(:slug).case_insensitive }
    it { should validate_presence_of(:status) }
    it { should validate_inclusion_of(:status).in_array(%w[active suspended deleted]) }

    context 'when slug is not provided' do
      it 'automatically generates slug from name' do
        tenant = create(:tenant, name: 'Test Company', slug: nil)
        expect(tenant.slug).to eq('test-company')
      end
    end

    context 'when slug contains invalid characters' do
      it 'is invalid' do
        tenant = build(:tenant, slug: 'invalid slug!')
        expect(tenant).not_to be_valid
        expect(tenant.errors[:slug]).to include('must be lowercase alphanumeric with hyphens')
      end
    end
  end

  describe 'associations' do
    it { should have_many(:users).dependent(:destroy) }
    it { should have_many(:products).dependent(:destroy) }
    it { should have_many(:api_keys).dependent(:destroy) }
    it { should have_many(:messages).dependent(:destroy) }
  end

  describe 'scopes' do
    describe '.active' do
      it 'returns only active tenants' do
        active_tenant = create(:tenant, status: 'active')
        create(:tenant, status: 'suspended')
        create(:tenant, status: 'deleted')

        expect(Tenant.active).to contain_exactly(active_tenant)
      end
    end

    describe '.not_deleted' do
      it 'excludes deleted tenants' do
        active = create(:tenant, status: 'active')
        suspended = create(:tenant, status: 'suspended')
        create(:tenant, status: 'deleted')

        expect(Tenant.not_deleted).to contain_exactly(active, suspended)
      end
    end
  end

  describe '#soft_delete' do
    let(:tenant) { create(:tenant, :with_users) }

    it 'marks tenant as deleted' do
      tenant.soft_delete

      expect(tenant.reload.status).to eq('deleted')
      expect(tenant.deleted_at).to be_present
      expect(tenant.deleted_at).to be_within(1.second).of(Time.current)
    end

    it 'does not actually destroy the record' do
      tenant_id = tenant.id
      tenant.soft_delete

      expect(Tenant.find(tenant_id)).to be_present
    end

    it 'cascades to associated records' do
      user_ids = tenant.users.pluck(:id)
      tenant.soft_delete

      user_ids.each do |user_id|
        expect(User.find(user_id).deleted_at).to be_present
      end
    end
  end

  describe '#activate' do
    let(:tenant) { create(:tenant, status: 'suspended') }

    it 'changes status to active' do
      tenant.activate

      expect(tenant.reload.status).to eq('active')
    end

    it 'clears suspended_at timestamp' do
      tenant.update(suspended_at: 1.day.ago)
      tenant.activate

      expect(tenant.reload.suspended_at).to be_nil
    end
  end

  describe '#suspend' do
    let(:tenant) { create(:tenant, status: 'active') }

    it 'changes status to suspended' do
      tenant.suspend(reason: 'Payment overdue')

      expect(tenant.reload.status).to eq('suspended')
      expect(tenant.suspended_at).to be_present
      expect(tenant.suspension_reason).to eq('Payment overdue')
    end

    it 'requires a reason' do
      expect { tenant.suspend }.to raise_error(ArgumentError)
    end
  end

  describe '#active?' do
    it 'returns true for active tenants' do
      tenant = create(:tenant, status: 'active')
      expect(tenant.active?).to be true
    end

    it 'returns false for non-active tenants' do
      tenant = create(:tenant, status: 'suspended')
      expect(tenant.active?).to be false
    end
  end

  describe 'encryption' do
    it 'encrypts sensitive fields' do
      tenant = create(:tenant)

      # Verify encrypted fields are not stored in plain text
      raw_attributes = Tenant.connection.select_one(
        "SELECT * FROM tenants WHERE id = #{tenant.id}"
      )

      # The encrypted field should not match the original value
      expect(raw_attributes['settings_ciphertext']).not_to eq(tenant.settings.to_json)
    end
  end
end
