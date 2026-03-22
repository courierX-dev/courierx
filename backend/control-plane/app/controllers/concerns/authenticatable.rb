# frozen_string_literal: true

module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request!
  end

  private

  def authenticate_request!
    @current_tenant = authenticate_via_jwt || authenticate_via_api_key

    unless @current_tenant
      render json: { error: "Unauthorized" }, status: :unauthorized
    end
  end

  def current_tenant
    @current_tenant
  end

  def authenticate_via_jwt
    token = extract_bearer_token
    return nil unless token

    payload = JwtService.decode(token)
    return nil unless payload

    Tenant.find_by(id: payload[:tenant_id])
  end

  def authenticate_via_api_key
    token = extract_bearer_token
    return nil unless token
    return nil unless token.start_with?("cxk_")

    ApiKey.authenticate(token)&.tenant
  end

  def extract_bearer_token
    header = request.headers["Authorization"]
    return nil unless header

    header.split(" ").last
  end
end
