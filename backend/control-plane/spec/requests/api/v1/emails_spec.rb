# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Emails API", type: :request do
  let(:tenant)  { create(:tenant) }
  let(:api_key) { create(:api_key, tenant: tenant) }
  let!(:domain) { create(:domain, tenant: tenant, domain: "example.com", status: "verified") }
  let(:headers) { api_key_headers(api_key.raw_key) }

  let(:valid_params) do
    {
      from_email: "noreply@example.com",
      to_email:   "user@example.com",
      subject:    "Test Subject",
      text_body:  "Hello"
    }
  end

  before do
    # Prevent OutboxProcessorJob from hitting Go
    allow(OutboxProcessorJob).to receive(:perform_async)
  end

  # ── POST /api/v1/emails ───────────────────────────────────────────────────

  describe "POST /api/v1/emails" do
    it "returns 202 Accepted on a valid send" do
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:accepted)
    end

    it "returns the queued email in the response body" do
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      body = json_response
      expect(body[:email][:status]).to eq("queued")
      expect(body[:email][:to_email]).to eq("user@example.com")
    end

    it "creates an Email record in the database" do
      expect {
        post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      }.to change(Email, :count).by(1)
    end

    it "returns 401 when Authorization header is missing" do
      post "/api/v1/emails", params: valid_params, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for a revoked API key" do
      api_key.revoke!
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for an expired API key" do
      api_key.update!(expires_at: 1.hour.ago, status: "expired")
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 422 when to_email is missing" do
      post "/api/v1/emails", params: valid_params.except(:to_email), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when from_email is missing" do
      post "/api/v1/emails", params: valid_params.except(:from_email), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when subject is missing" do
      post "/api/v1/emails", params: valid_params.except(:subject), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when sending to a suppressed address" do
      create(:suppression, tenant: tenant, email: "user@example.com")
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  # ── GET /api/v1/emails ────────────────────────────────────────────────────

  describe "GET /api/v1/emails" do
    before { create_list(:email, 3, tenant: tenant) }

    it "returns 200 with the tenant's emails" do
      get "/api/v1/emails", headers: headers
      expect(response).to have_http_status(:ok)
      expect(json_response.length).to eq(3)
    end

    it "returns 401 without auth" do
      get "/api/v1/emails"
      expect(response).to have_http_status(:unauthorized)
    end

    it "filters by status" do
      create(:email, :sent, tenant: tenant)
      get "/api/v1/emails", params: { status: "sent" }, headers: headers
      body = json_response
      expect(body).to all(include(status: "sent"))
    end
  end

  # ── GET /api/v1/emails/:id ────────────────────────────────────────────────

  describe "GET /api/v1/emails/:id" do
    let(:email) { create(:email, tenant: tenant) }

    it "returns 200 with the email" do
      get "/api/v1/emails/#{email.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(json_response[:id]).to eq(email.id)
    end

    it "returns 404 for an email belonging to a different tenant" do
      other_tenant = create(:tenant)
      other_email  = create(:email, tenant: other_tenant)
      get "/api/v1/emails/#{other_email.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 401 without auth" do
      get "/api/v1/emails/#{email.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ── Cross-tenant isolation ────────────────────────────────────────────────

  describe "cross-tenant isolation" do
    it "cannot list emails from another tenant" do
      other_tenant = create(:tenant)
      create(:email, tenant: other_tenant)

      get "/api/v1/emails", headers: headers
      expect(json_response).to be_empty
    end
  end
end
