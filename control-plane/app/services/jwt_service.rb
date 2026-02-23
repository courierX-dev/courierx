# frozen_string_literal: true

module JwtService
  SECRET = ENV.fetch("JWT_SECRET") { Rails.application.secret_key_base }
  ALGORITHM = "HS256"
  EXPIRY = 24.hours

  module_function

  def encode(payload = {}, exp: EXPIRY)
    payload = payload.dup
    payload[:exp] = exp.from_now.to_i
    payload[:iat] = Time.current.to_i
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def decode(token)
    body = JWT.decode(token, SECRET, true, algorithm: ALGORITHM).first
    HashWithIndifferentAccess.new(body)
  rescue JWT::DecodeError, JWT::ExpiredSignature => e
    nil
  end
end
