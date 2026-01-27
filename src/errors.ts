export type ErrorCategory = 'API_ERROR' | 'DB_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export interface ErrorMetadata {
  statusCode?: number;
  cause?: string;
  retryable: boolean;
  context?: Record<string, any>;
}

export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public metadata: ErrorMetadata = { retryable: false }
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      metadata: this.metadata,
    };
  }
}

export class ApiError extends AppError {
  constructor(message: string, statusCode?: number, cause?: string) {
    const retryable = !statusCode || statusCode >= 500 || statusCode === 429;
    super(message, 'API_ERROR', {
      statusCode,
      cause,
      retryable,
    });
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static fromResponse(status: number, text: string): ApiError {
    const message = `API returned ${status}`;
    return new ApiError(message, status, text);
  }
}

export class DbError extends AppError {
  constructor(message: string, cause?: string) {
    super(message, 'DB_ERROR', {
      retryable: true, // DB errors are often transient
      cause,
    });
    this.name = 'DbError';
    Object.setPrototypeOf(this, DbError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', {
      retryable: false, // Validation errors don't benefit from retry
      context,
    });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, cause?: string) {
    super(message, 'NETWORK_ERROR', {
      retryable: true, // Network errors are transient
      cause,
    });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.metadata.retryable;
  }
  return false;
}

export function getErrorCategory(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }
  return 'UNKNOWN_ERROR';
}
