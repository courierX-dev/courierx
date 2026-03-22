# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JwtService do
  let(:tenant) { create(:tenant) }
  let(:payload) { { tenant_id: tenant.id } }

  describe '.encode' do
    it 'generates a valid JWT token' do
      token = described_class.encode(payload)

      expect(token).to be_a(String)
      expect(token.split('.').length).to eq(3)
    end

    it 'includes the payload data' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded[:tenant_id]).to eq(tenant.id)
    end

    it 'includes expiration time' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded[:exp]).to be_present
      expect(decoded[:exp]).to be > Time.current.to_i
    end

    it 'sets expiration to 24 hours by default' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expected_exp = 24.hours.from_now.to_i
      expect(decoded[:exp]).to be_within(5).of(expected_exp)
    end

    it 'includes issued-at timestamp' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded[:iat]).to be_present
      expect(decoded[:iat]).to be_within(5).of(Time.current.to_i)
    end
  end

  describe '.decode' do
    it 'decodes a valid token' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded).to be_a(HashWithIndifferentAccess)
      expect(decoded[:tenant_id]).to eq(tenant.id)
    end

    it 'returns nil for an invalid token' do
      decoded = described_class.decode('invalid.token.here')

      expect(decoded).to be_nil
    end

    it 'returns nil for an expired token' do
      expired_payload = payload.merge(exp: 1.day.ago.to_i)
      token = JWT.encode(expired_payload, described_class::SECRET, described_class::ALGORITHM)

      decoded = described_class.decode(token)

      expect(decoded).to be_nil
    end

    it 'returns nil for a token signed with the wrong secret' do
      wrong_secret_token = JWT.encode(
        payload.merge(exp: 24.hours.from_now.to_i),
        'wrong_secret',
        'HS256'
      )

      decoded = described_class.decode(wrong_secret_token)

      expect(decoded).to be_nil
    end
  end

  describe 'token properties' do
    it 'generates different tokens for same payload due to timestamps' do
      token1 = described_class.encode(payload)
      sleep 1.1
      token2 = described_class.encode(payload)

      expect(token1).not_to eq(token2)
    end

    it 'uses HS256 algorithm' do
      token = described_class.encode(payload)
      header = JSON.parse(Base64.decode64(token.split('.').first))

      expect(header['alg']).to eq('HS256')
    end

    it 'preserves custom payload fields' do
      custom_payload = payload.merge(custom_field: 'value')
      token = described_class.encode(custom_payload)
      decoded = described_class.decode(token)

      expect(decoded[:custom_field]).to eq('value')
    end
  end
end
