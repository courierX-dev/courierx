# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JwtService do
  let(:user) { create(:user) }
  let(:payload) { { user_id: user.id, tenant_id: user.tenant_id } }

  describe '.encode' do
    it 'generates a valid JWT token' do
      token = described_class.encode(payload)

      expect(token).to be_a(String)
      expect(token.split('.').length).to eq(3) # JWT has 3 parts
    end

    it 'includes the payload data' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded[:user_id]).to eq(user.id)
      expect(decoded[:tenant_id]).to eq(user.tenant_id)
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

    it 'allows custom expiration time' do
      token = described_class.encode(payload, exp: 1.hour.from_now)
      decoded = described_class.decode(token)

      expected_exp = 1.hour.from_now.to_i
      expect(decoded[:exp]).to be_within(5).of(expected_exp)
    end
  end

  describe '.decode' do
    it 'decodes a valid token' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded).to be_a(Hash)
      expect(decoded[:user_id]).to eq(user.id)
    end

    it 'returns symbolized keys' do
      token = described_class.encode(payload)
      decoded = described_class.decode(token)

      expect(decoded.keys).to all(be_a(Symbol))
    end

    it 'raises error for invalid token' do
      expect {
        described_class.decode('invalid.token.here')
      }.to raise_error(JWT::DecodeError)
    end

    it 'raises error for expired token' do
      token = described_class.encode(payload, exp: 1.second.ago)

      expect {
        described_class.decode(token)
      }.to raise_error(JWT::ExpiredSignature)
    end

    it 'raises error for tampered token' do
      token = described_class.encode(payload)
      tampered_token = token[0..-10] + 'tampered'

      expect {
        described_class.decode(tampered_token)
      }.to raise_error(JWT::VerificationError)
    end

    it 'validates token signature' do
      # Create token with wrong secret
      wrong_secret_token = JWT.encode(
        payload.merge(exp: 24.hours.from_now.to_i),
        'wrong_secret',
        'HS256'
      )

      expect {
        described_class.decode(wrong_secret_token)
      }.to raise_error(JWT::VerificationError)
    end
  end

  describe '.refresh' do
    it 'generates a new token with extended expiration' do
      original_token = described_class.encode(payload, exp: 1.hour.from_now)

      sleep 1 # Ensure time difference

      refreshed_token = described_class.refresh(original_token)
      original_decoded = described_class.decode(original_token)
      refreshed_decoded = described_class.decode(refreshed_token)

      expect(refreshed_decoded[:exp]).to be > original_decoded[:exp]
      expect(refreshed_decoded[:user_id]).to eq(original_decoded[:user_id])
    end

    it 'preserves original payload data' do
      original_token = described_class.encode(payload.merge(custom_field: 'value'))
      refreshed_token = described_class.refresh(original_token)
      refreshed_decoded = described_class.decode(refreshed_token)

      expect(refreshed_decoded[:custom_field]).to eq('value')
    end

    it 'raises error for expired token' do
      expired_token = described_class.encode(payload, exp: 1.second.ago)

      expect {
        described_class.refresh(expired_token)
      }.to raise_error(JWT::ExpiredSignature)
    end
  end

  describe 'token security' do
    it 'uses a strong secret key' do
      secret = Rails.application.credentials.secret_key_base

      expect(secret).to be_present
      expect(secret.length).to be >= 32
    end

    it 'generates different tokens for same payload' do
      token1 = described_class.encode(payload)
      sleep 0.001 # Ensure different timestamp
      token2 = described_class.encode(payload)

      # Tokens should be different due to different exp/iat
      expect(token1).not_to eq(token2)
    end

    it 'uses HS256 algorithm' do
      token = described_class.encode(payload)
      header = JSON.parse(Base64.decode64(token.split('.').first))

      expect(header['alg']).to eq('HS256')
    end
  end
end
