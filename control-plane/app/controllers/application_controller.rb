class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid,  with: :unprocessable
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def not_found
    render json: {
      error:   "Not found",
      code:    "not_found",
      details: {}
    }, status: :not_found
  end

  def unprocessable(exception)
    render json: {
      error:   "Validation failed",
      code:    "validation_error",
      details: exception.record.errors.messages
    }, status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: {
      error:   exception.message,
      code:    "bad_request",
      details: {}
    }, status: :bad_request
  end

  def forbidden(message = "Forbidden")
    render json: {
      error:   message,
      code:    "forbidden",
      details: {}
    }, status: :forbidden
  end

  def conflict(message = "Conflict")
    render json: {
      error:   message,
      code:    "conflict",
      details: {}
    }, status: :conflict
  end
end
