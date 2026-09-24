/** An API failure, reduced to what the storefront may act on and show. Never carries a stack or a backend message for a 5xx. */
export class ApiError extends Error {
  constructor({ status, code, message, details, retryAfter }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
    this.retryAfter = retryAfter;
  }

  get unavailable() {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}

export const isApiError = (error) => error instanceof ApiError;

export const UNAVAILABLE_MESSAGE = 'We could not reach the store just now. Please try again in a moment.';
