# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Email Sending Flow', type: :integration do
  let(:tenant) { create(:tenant) }
  let(:product) { create(:product, tenant: tenant) }
  let(:api_key_headers) { { 'X-API-Key' => product.api_key } }

  # This integration test demonstrates the complete flow:
  # 1. Client authenticates with API key
  # 2. Sends email request to Rails API
  # 3. Rails enqueues job
  # 4. Background job forwards to Go Core
  # 5. Go Core sends via provider
  # 6. Webhook updates status

  describe 'complete email sending flow' do
    let(:email_params) do
      {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Integration Test Email',
        body: 'This is a test email from the integration test suite',
        html: '<p>This is a <strong>test email</strong> from the integration test suite</p>'
      }
    end

    before do
      # Stub Go Core API
      stub_request(:post, "#{ENV['GO_CORE_URL']}/api/send")
        .to_return(
          status: 200,
          body: {
            message_id: 'msg_123abc',
            status: 'sent',
            provider: 'aws_ses'
          }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
    end

    it 'successfully sends an email through the complete system' do
      # Step 1: Send email request
      post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json

      expect(response).to have_http_status(:accepted)
      expect(json_response[:data]).to include(
        :id,
        :status,
        :from,
        :to,
        :subject
      )
      expect(json_response[:data][:status]).to eq('queued')

      message_id = json_response[:data][:id]
      message = Message.find(message_id)

      # Step 2: Verify message was created
      expect(message).to be_present
      expect(message.tenant_id).to eq(tenant.id)
      expect(message.product_id).to eq(product.id)
      expect(message.status).to eq('queued')
      expect(message.from).to eq('sender@example.com')
      expect(message.to).to eq('recipient@example.com')

      # Step 3: Process background job
      perform_enqueued_jobs do
        SendEmailJob.perform_later(message.id)
      end

      # Step 4: Verify Go Core was called
      expect(WebMock).to have_requested(:post, "#{ENV['GO_CORE_URL']}/api/send")
        .with(
          body: hash_including(
            'from' => 'sender@example.com',
            'to' => 'recipient@example.com',
            'subject' => 'Integration Test Email'
          )
        ).once

      # Step 5: Verify message status updated
      message.reload
      expect(message.status).to eq('sent')
      expect(message.provider_message_id).to eq('msg_123abc')
      expect(message.provider).to eq('aws_ses')
      expect(message.sent_at).to be_within(1.second).of(Time.current)

      # Step 6: Verify event was logged
      event = message.events.last
      expect(event).to be_present
      expect(event.event_type).to eq('sent')
      expect(event.provider).to eq('aws_ses')
    end

    it 'handles provider failure gracefully' do
      # Stub Go Core to return error
      stub_request(:post, "#{ENV['GO_CORE_URL']}/api/send")
        .to_return(
          status: 500,
          body: { error: 'Provider temporarily unavailable' }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

      post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json
      message_id = json_response[:data][:id]

      perform_enqueued_jobs do
        SendEmailJob.perform_later(message_id)
      end

      message = Message.find(message_id)
      expect(message.status).to eq('failed')
      expect(message.error_message).to be_present
      expect(message.retry_count).to be >= 1
    end

    it 'retries failed sends with exponential backoff' do
      failure_count = 0

      # First 2 attempts fail, 3rd succeeds
      stub_request(:post, "#{ENV['GO_CORE_URL']}/api/send")
        .to_return do |request|
          failure_count += 1
          if failure_count <= 2
            { status: 500, body: { error: 'Temporary failure' }.to_json }
          else
            {
              status: 200,
              body: { message_id: 'msg_retry_success', status: 'sent' }.to_json
            }
          end
        end

      post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json
      message_id = json_response[:data][:id]

      perform_enqueued_jobs do
        SendEmailJob.perform_later(message_id)
      end

      message = Message.find(message_id)
      expect(message.status).to eq('sent')
      expect(message.retry_count).to eq(2) # Failed twice before success
      expect(failure_count).to eq(3) # Attempted 3 times total
    end

    it 'enforces rate limiting per tenant' do
      # Create rate limit for tenant
      RateLimiter.new(tenant).set_limit(requests: 100, period: 1.hour)

      # Make 101 requests rapidly
      results = []
      101.times do
        post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json
        results << response.status
      end

      # Last request should be rate limited
      expect(results.last).to eq(429)
      expect(json_response[:error]).to match(/rate limit/i)

      # Verify only 100 messages were created
      expect(Message.where(tenant_id: tenant.id).count).to eq(100)
    end

    it 'tracks message events through complete lifecycle' do
      post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json
      message_id = json_response[:data][:id]

      perform_enqueued_jobs do
        SendEmailJob.perform_later(message_id)
      end

      # Simulate webhook events
      message = Message.find(message_id)

      # Delivered event
      post '/webhooks/sendgrid',
           params: {
             event: 'delivered',
             message_id: message.provider_message_id,
             timestamp: Time.current.to_i
           }.to_json,
           headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)

      message.reload
      expect(message.status).to eq('delivered')
      expect(message.delivered_at).to be_present

      # Opened event
      post '/webhooks/sendgrid',
           params: {
             event: 'open',
             message_id: message.provider_message_id,
             timestamp: Time.current.to_i,
             user_agent: 'Mozilla/5.0...'
           }.to_json,
           headers: { 'Content-Type' => 'application/json' }

      message.reload
      expect(message.opened_at).to be_present
      expect(message.events.where(event_type: 'opened').count).to eq(1)

      # Clicked event
      post '/webhooks/sendgrid',
           params: {
             event: 'click',
             message_id: message.provider_message_id,
             url: 'https://example.com/link',
             timestamp: Time.current.to_i
           }.to_json,
           headers: { 'Content-Type' => 'application/json' }

      message.reload
      expect(message.clicked_at).to be_present
      expect(message.events.where(event_type: 'clicked').count).to eq(1)

      # Verify complete event history
      event_types = message.events.order(:created_at).pluck(:event_type)
      expect(event_types).to eq(['queued', 'sent', 'delivered', 'opened', 'clicked'])
    end

    it 'validates API key before processing' do
      invalid_headers = { 'X-API-Key' => 'sk_invalid_key' }

      post '/api/v1/messages', headers: invalid_headers, params: email_params, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json_response[:error]).to eq('Invalid API key')
      expect(Message.count).to eq(0) # No message created
    end

    it 'rejects requests for suspended tenants' do
      tenant.suspend(reason: 'Payment overdue')

      post '/api/v1/messages', headers: api_key_headers, params: email_params, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json_response[:error]).to match(/suspended/i)
      expect(Message.count).to eq(0)
    end
  end

  describe 'webhook signature verification' do
    let(:message) { create(:message, tenant: tenant, product: product) }
    let(:webhook_payload) do
      {
        event: 'delivered',
        message_id: message.provider_message_id,
        timestamp: Time.current.to_i
      }
    end

    it 'accepts valid SendGrid webhook signature' do
      signature = generate_sendgrid_signature(webhook_payload)

      post '/webhooks/sendgrid',
           params: webhook_payload.to_json,
           headers: {
             'Content-Type' => 'application/json',
             'X-Twilio-Email-Event-Webhook-Signature' => signature
           }

      expect(response).to have_http_status(:ok)
    end

    it 'rejects invalid webhook signature' do
      post '/webhooks/sendgrid',
           params: webhook_payload.to_json,
           headers: {
             'Content-Type' => 'application/json',
             'X-Twilio-Email-Event-Webhook-Signature' => 'invalid_signature'
           }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects replayed webhook events' do
      signature = generate_sendgrid_signature(webhook_payload)

      # First request succeeds
      post '/webhooks/sendgrid',
           params: webhook_payload.to_json,
           headers: {
             'Content-Type' => 'application/json',
             'X-Twilio-Email-Event-Webhook-Signature' => signature
           }

      expect(response).to have_http_status(:ok)

      # Replay attempt is rejected
      post '/webhooks/sendgrid',
           params: webhook_payload.to_json,
           headers: {
             'Content-Type' => 'application/json',
             'X-Twilio-Email-Event-Webhook-Signature' => signature
           }

      expect(response).to have_http_status(:conflict)
      expect(json_response[:error]).to match(/already processed/i)
    end
  end

  private

  def generate_sendgrid_signature(payload)
    # Simplified signature generation for testing
    # In real implementation, use SendGrid's verification method
    OpenSSL::HMAC.hexdigest(
      'SHA256',
      Rails.application.credentials.dig(:sendgrid, :webhook_secret),
      payload.to_json
    )
  end
end
