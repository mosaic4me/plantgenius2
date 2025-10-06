/**
 * Custom error types for PlantGenius application
 */

export class PlantIdError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'PlantIdError';
    Object.setPrototypeOf(this, PlantIdError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public reference?: string
  ) {
    super(message);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export type AppError =
  | PlantIdError
  | NetworkError
  | ValidationError
  | AuthenticationError
  | PaymentError;

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && (
    error instanceof PlantIdError ||
    error instanceof NetworkError ||
    error instanceof ValidationError ||
    error instanceof AuthenticationError ||
    error instanceof PaymentError
  );
}
