import type { CourierXErrorResponse } from "./types"

export class CourierXError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = "CourierXError"
    this.status = status
    this.code = statusToCode(status)
    this.errors = errors
  }

  static fromResponse(status: number, body: CourierXErrorResponse): CourierXError {
    const message =
      body.error ?? body.errors?.[0] ?? `Request failed with status ${status}`
    return new CourierXError(message, status, body.errors ?? [])
  }
}

export class AuthenticationError extends CourierXError {
  constructor(message = "Invalid API key") {
    super(message, 401)
    this.name = "AuthenticationError"
  }
}

export class RateLimitError extends CourierXError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429)
    this.name = "RateLimitError"
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return "bad_request"
    case 401:
      return "unauthorized"
    case 403:
      return "forbidden"
    case 404:
      return "not_found"
    case 422:
      return "unprocessable_entity"
    case 429:
      return "rate_limited"
    default:
      return status >= 500 ? "server_error" : "unknown_error"
  }
}
