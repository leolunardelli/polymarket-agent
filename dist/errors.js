"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorCategory = exports.isRetryable = exports.NetworkError = exports.ValidationError = exports.DbError = exports.ApiError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, category, metadata = { retryable: false }) {
        super(message);
        this.category = category;
        this.metadata = metadata;
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
exports.AppError = AppError;
class ApiError extends AppError {
    constructor(message, statusCode, cause) {
        const retryable = !statusCode || statusCode >= 500 || statusCode === 429;
        super(message, 'API_ERROR', {
            statusCode,
            cause,
            retryable,
        });
        this.name = 'ApiError';
        Object.setPrototypeOf(this, ApiError.prototype);
    }
    static fromResponse(status, text) {
        const message = `API returned ${status}`;
        return new ApiError(message, status, text);
    }
}
exports.ApiError = ApiError;
class DbError extends AppError {
    constructor(message, cause) {
        super(message, 'DB_ERROR', {
            retryable: true, // DB errors are often transient
            cause,
        });
        this.name = 'DbError';
        Object.setPrototypeOf(this, DbError.prototype);
    }
}
exports.DbError = DbError;
class ValidationError extends AppError {
    constructor(message, context) {
        super(message, 'VALIDATION_ERROR', {
            retryable: false, // Validation errors don't benefit from retry
            context,
        });
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class NetworkError extends AppError {
    constructor(message, cause) {
        super(message, 'NETWORK_ERROR', {
            retryable: true, // Network errors are transient
            cause,
        });
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
exports.NetworkError = NetworkError;
function isRetryable(error) {
    if (error instanceof AppError) {
        return error.metadata.retryable;
    }
    return false;
}
exports.isRetryable = isRetryable;
function getErrorCategory(error) {
    if (error instanceof AppError) {
        return error.category;
    }
    return 'UNKNOWN_ERROR';
}
exports.getErrorCategory = getErrorCategory;
//# sourceMappingURL=errors.js.map