# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Products API', type: :request do
  let(:tenant) { create(:tenant) }
  let(:user) { create(:user, tenant: tenant, role: 'owner') }
  let(:headers) { auth_headers(user) }
  let(:api_key_headers) { api_key_headers(tenant) }

  describe 'GET /api/v1/products' do
    context 'with JWT authentication' do
      before do
        create_list(:product, 3, tenant: tenant)
        create_list(:product, 2) # Other tenant's products
      end

      it 'returns products for authenticated tenant' do
        get '/api/v1/products', headers: headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data].length).to eq(3)
        expect(json_response[:data].first).to have_key(:id)
        expect(json_response[:data].first).to have_key(:name)
        expect(json_response[:data].first).to have_key(:api_key)
      end

      it 'includes pagination metadata' do
        get '/api/v1/products', headers: headers

        expect(json_response).to have_key(:meta)
        expect(json_response[:meta]).to include(
          :current_page,
          :total_pages,
          :total_count,
          :per_page
        )
      end

      it 'supports pagination' do
        create_list(:product, 25, tenant: tenant)

        get '/api/v1/products', headers: headers, params: { page: 2, per_page: 10 }

        expect(response).to have_http_status(:ok)
        expect(json_response[:data].length).to eq(10)
        expect(json_response[:meta][:current_page]).to eq(2)
      end

      it 'supports filtering by status' do
        active = create(:product, tenant: tenant, status: 'active')
        create(:product, tenant: tenant, status: 'inactive')

        get '/api/v1/products', headers: headers, params: { status: 'active' }

        expect(response).to have_http_status(:ok)
        expect(json_response[:data].length).to eq(1)
        expect(json_response[:data].first[:id]).to eq(active.id)
      end

      it 'requires authentication' do
        get '/api/v1/products'

        expect(response).to have_http_status(:unauthorized)
        expect(json_response[:error]).to eq('Missing or invalid token')
      end

      it 'rejects invalid JWT token' do
        get '/api/v1/products', headers: { 'Authorization' => 'Bearer invalid_token' }

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with API key authentication' do
      it 'returns products for the API key\'s tenant' do
        create_list(:product, 2, tenant: tenant)

        get '/api/v1/products', headers: api_key_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data].length).to eq(2)
      end
    end
  end

  describe 'GET /api/v1/products/:id' do
    let(:product) { create(:product, tenant: tenant) }

    it 'returns a single product' do
      get "/api/v1/products/#{product.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:id]).to eq(product.id)
      expect(json_response[:data][:name]).to eq(product.name)
    end

    it 'returns 404 for non-existent product' do
      get '/api/v1/products/99999', headers: headers

      expect(response).to have_http_status(:not_found)
      expect(json_response[:error]).to eq('Product not found')
    end

    it 'returns 404 for other tenant\'s product' do
      other_product = create(:product)

      get "/api/v1/products/#{other_product.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/products' do
    let(:valid_params) do
      {
        product: {
          name: 'New Product',
          description: 'Product description'
        }
      }
    end

    it 'creates a new product' do
      expect {
        post '/api/v1/products', headers: headers, params: valid_params, as: :json
      }.to change(Product, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response[:data][:name]).to eq('New Product')
      expect(json_response[:data][:api_key]).to be_present
    end

    it 'automatically generates API key' do
      post '/api/v1/products', headers: headers, params: valid_params, as: :json

      product = Product.last
      expect(product.api_key).to start_with('sk_')
      expect(product.api_key.length).to eq(48)
    end

    it 'associates product with current tenant' do
      post '/api/v1/products', headers: headers, params: valid_params, as: :json

      product = Product.last
      expect(product.tenant_id).to eq(tenant.id)
    end

    it 'validates required fields' do
      post '/api/v1/products',
           headers: headers,
           params: { product: { description: 'No name' } },
           as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response[:errors][:name]).to include("can't be blank")
    end

    it 'requires owner or admin role' do
      member = create(:user, tenant: tenant, role: 'member')
      member_headers = auth_headers(member)

      post '/api/v1/products', headers: member_headers, params: valid_params, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json_response[:error]).to eq('Insufficient permissions')
    end
  end

  describe 'PATCH /api/v1/products/:id' do
    let(:product) { create(:product, tenant: tenant) }
    let(:update_params) do
      {
        product: {
          name: 'Updated Name',
          description: 'Updated description'
        }
      }
    end

    it 'updates the product' do
      patch "/api/v1/products/#{product.id}",
            headers: headers,
            params: update_params,
            as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:name]).to eq('Updated Name')
      expect(product.reload.name).to eq('Updated Name')
    end

    it 'does not allow updating tenant_id' do
      other_tenant = create(:tenant)

      patch "/api/v1/products/#{product.id}",
            headers: headers,
            params: { product: { tenant_id: other_tenant.id } },
            as: :json

      expect(product.reload.tenant_id).to eq(tenant.id)
    end

    it 'returns 404 for other tenant\'s product' do
      other_product = create(:product)

      patch "/api/v1/products/#{other_product.id}",
            headers: headers,
            params: update_params,
            as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/products/:id' do
    let!(:product) { create(:product, tenant: tenant) }

    it 'soft deletes the product' do
      delete "/api/v1/products/#{product.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(product.reload.deleted_at).to be_present
      expect(product.status).to eq('deleted')
    end

    it 'does not hard delete the record' do
      product_id = product.id
      delete "/api/v1/products/#{product.id}", headers: headers

      expect(Product.unscoped.find(product_id)).to be_present
    end

    it 'requires owner or admin role' do
      member = create(:user, tenant: tenant, role: 'member')
      member_headers = auth_headers(member)

      delete "/api/v1/products/#{product.id}", headers: member_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'POST /api/v1/products/:id/regenerate_api_key' do
    let(:product) { create(:product, tenant: tenant) }
    let(:old_api_key) { product.api_key }

    it 'generates a new API key' do
      post "/api/v1/products/#{product.id}/regenerate_api_key", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:api_key]).not_to eq(old_api_key)
      expect(product.reload.api_key).not_to eq(old_api_key)
    end

    it 'invalidates the old API key' do
      old_key = product.api_key
      post "/api/v1/products/#{product.id}/regenerate_api_key", headers: headers

      # Try to use old API key
      get '/api/v1/products', headers: { 'X-API-Key' => old_key }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'requires owner or admin role' do
      member = create(:user, tenant: tenant, role: 'member')
      member_headers = auth_headers(member)

      post "/api/v1/products/#{product.id}/regenerate_api_key", headers: member_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'rate limiting' do
    it 'enforces rate limits per tenant' do
      # Make 100 rapid requests
      101.times do |i|
        get '/api/v1/products', headers: headers
        break if response.status == 429
      end

      expect(response).to have_http_status(:too_many_requests)
      expect(json_response[:error]).to match(/rate limit/i)
      expect(response.headers['X-RateLimit-Limit']).to be_present
      expect(response.headers['X-RateLimit-Remaining']).to eq('0')
    end
  end
end
