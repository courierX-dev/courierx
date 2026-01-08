# frozen_string_literal: true

module RequestSpecHelper
  # Helper to create JWT token for authenticated requests
  def auth_headers(user)
    token = JwtService.encode(user_id: user.id, tenant_id: user.tenant_id)
    { 'Authorization' => "Bearer #{token}" }
  end

  # Helper to create API key headers
  def api_key_headers(api_key_string)
    { 'Authorization' => "Bearer #{api_key_string}" }
  end

  # Parse JSON response
  def json_response
    JSON.parse(response.body, symbolize_names: true)
  end

  # Stub Go Core API calls
  def stub_go_core_request(method, path, response_body: {}, status: 200)
    stub_request(method, "#{ENV['GO_CORE_URL']}#{path}")
      .to_return(
        status: status,
        body: response_body.to_json,
        headers: { 'Content-Type' => 'application/json' }
      )
  end
end
