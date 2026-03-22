# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::ProviderConnections", type: :request do
  let!(:tenant) { create(:tenant) }
  let(:headers) { { "Authorization" => "Bearer #{JwtService.encode(tenant_id: tenant.id)}" } }

  describe "GET /api/v1/provider_connections" do
    it "returns an empty list when no connections exist" do
      get "/api/v1/provider_connections", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq([])
    end

    it "returns connections ordered by priority" do
      create(:provider_connection, tenant: tenant, provider: "sendgrid", priority: 2)
      create(:provider_connection, tenant: tenant, provider: "mailgun", priority: 1)

      get "/api/v1/provider_connections", headers: headers

      body = JSON.parse(response.body, symbolize_names: true)
      expect(body.length).to eq(2)
      expect(body.first[:provider]).to eq("mailgun")
      expect(body.last[:provider]).to eq("sendgrid")
    end

    it "does not return connections from other tenants" do
      other_tenant = create(:tenant)
      create(:provider_connection, tenant: other_tenant, provider: "sendgrid")

      get "/api/v1/provider_connections", headers: headers

      body = JSON.parse(response.body)
      expect(body).to eq([])
    end

    it "returns 401 without auth" do
      get "/api/v1/provider_connections"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/provider_connections" do
    let(:valid_params) do
      {
        provider: "sendgrid",
        api_key: "SG.test_key_12345",
        priority: 1,
        display_name: "Production SendGrid"
      }
    end

    it "creates a connection and returns it" do
      post "/api/v1/provider_connections", params: valid_params, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:provider]).to eq("sendgrid")
      expect(body[:display_name]).to eq("Production SendGrid")
      expect(body[:priority]).to eq(1)
      expect(body[:status]).to eq("active")
      # Encrypted credentials are never exposed in response
      expect(body).not_to have_key(:api_key)
      expect(body).not_to have_key(:encrypted_api_key)
    end

    it "encrypts the api_key" do
      post "/api/v1/provider_connections", params: valid_params, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      conn = ProviderConnection.last
      expect(conn.encrypted_api_key).to be_present
      expect(conn.encrypted_api_key).not_to eq("SG.test_key_12345")
      expect(conn.api_key).to eq("SG.test_key_12345")
    end

    it "rejects an invalid provider" do
      post "/api/v1/provider_connections",
           params: valid_params.merge(provider: "invalid_provider"),
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:errors]).to be_present
    end

    it "rejects duplicate provider for the same tenant and mode" do
      create(:provider_connection, tenant: tenant, provider: "sendgrid", mode: "byok")
      post "/api/v1/provider_connections",
           params: valid_params.merge(mode: "byok"),
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "creates SES connection with secret and region" do
      ses_params = {
        provider: "aws_ses",
        api_key: "AKIAIOSFODNN7EXAMPLE",
        secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1",
        priority: 1
      }
      post "/api/v1/provider_connections", params: ses_params, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      conn = ProviderConnection.last
      expect(conn.api_key).to eq("AKIAIOSFODNN7EXAMPLE")
      expect(conn.secret).to eq("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
      expect(conn.region).to eq("us-east-1")
    end

    it "creates SMTP connection with host and port" do
      smtp_params = {
        provider: "smtp",
        api_key: "smtp_user",
        secret: "smtp_password",
        smtp_host: "smtp.example.com",
        smtp_port: 587,
        priority: 1
      }
      post "/api/v1/provider_connections", params: smtp_params, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      conn = ProviderConnection.last
      expect(conn.smtp_host).to eq("smtp.example.com")
      expect(conn.smtp_port).to eq(587)
    end
  end

  describe "GET /api/v1/provider_connections/:id" do
    it "returns a single connection" do
      conn = create(:provider_connection, tenant: tenant, provider: "resend")

      get "/api/v1/provider_connections/#{conn.id}", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:id]).to eq(conn.id)
      expect(body[:provider]).to eq("resend")
    end

    it "returns 404 for another tenant's connection" do
      other_tenant = create(:tenant)
      conn = create(:provider_connection, tenant: other_tenant, provider: "resend")

      get "/api/v1/provider_connections/#{conn.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/v1/provider_connections/:id" do
    let!(:conn) { create(:provider_connection, tenant: tenant, provider: "sendgrid", priority: 1) }

    it "updates the connection" do
      patch "/api/v1/provider_connections/#{conn.id}",
            params: { priority: 5, display_name: "Updated Name" },
            headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body, symbolize_names: true)
      expect(body[:priority]).to eq(5)
      expect(body[:display_name]).to eq("Updated Name")
    end

    it "updates credentials" do
      patch "/api/v1/provider_connections/#{conn.id}",
            params: { api_key: "new_key_value" },
            headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      # Fetch a fresh instance to avoid memoized virtual attribute
      updated = ProviderConnection.find(conn.id)
      expect(updated.api_key).to eq("new_key_value")
    end
  end

  describe "DELETE /api/v1/provider_connections/:id" do
    let!(:conn) { create(:provider_connection, tenant: tenant, provider: "postmark") }

    it "deletes the connection" do
      delete "/api/v1/provider_connections/#{conn.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(ProviderConnection.find_by(id: conn.id)).to be_nil
    end

    it "cannot delete another tenant's connection" do
      other_tenant = create(:tenant)
      other_conn = create(:provider_connection, tenant: other_tenant, provider: "postmark")

      delete "/api/v1/provider_connections/#{other_conn.id}", headers: headers

      expect(response).to have_http_status(:not_found)
      expect(ProviderConnection.find_by(id: other_conn.id)).to be_present
    end
  end
end
