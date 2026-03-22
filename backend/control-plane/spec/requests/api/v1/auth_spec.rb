# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  describe "POST /api/v1/auth/register" do
    let(:valid_params) do
      {
        name: "Test Corp",
        email: "test@example.com",
        password: "securepass123",
        mode: "demo"
      }
    end

    it "creates a tenant and returns a JWT token" do
      post "/api/v1/auth/register", params: valid_params, as: :json

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:token]).to be_present
      expect(body[:tenant][:name]).to eq("Test Corp")
      expect(body[:tenant][:email]).to eq("test@example.com")
    end

    it "rejects registration without a password" do
      post "/api/v1/auth/register", params: valid_params.except(:password), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:errors]).to include(a_string_matching(/password/i))
    end

    it "rejects registration with a short password" do
      post "/api/v1/auth/register", params: valid_params.merge(password: "short"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:errors]).to include(a_string_matching(/password/i))
    end

    it "rejects duplicate email" do
      create(:tenant, email: "test@example.com")
      post "/api/v1/auth/register", params: valid_params, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/auth/login" do
    let!(:tenant) { create(:tenant, email: "user@example.com", password: "securepass123") }

    it "returns a token with correct credentials" do
      post "/api/v1/auth/login", params: { email: "user@example.com", password: "securepass123" }, as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:token]).to be_present
      expect(body[:tenant][:id]).to eq(tenant.id)
    end

    it "rejects wrong password" do
      post "/api/v1/auth/login", params: { email: "user@example.com", password: "wrongpass" }, as: :json

      expect(response).to have_http_status(:unauthorized)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:error]).to eq("Invalid email or password")
    end

    it "rejects non-existent email" do
      post "/api/v1/auth/login", params: { email: "nobody@example.com", password: "anything" }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/auth/me" do
    let!(:tenant) { create(:tenant) }

    it "returns the current tenant when authenticated" do
      token = JwtService.encode(tenant_id: tenant.id)
      get "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{token}" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:tenant][:id]).to eq(tenant.id)
    end

    it "returns 401 without a token" do
      get "/api/v1/auth/me"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 with an invalid token" do
      get "/api/v1/auth/me", headers: { "Authorization" => "Bearer invalid.token.here" }

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
