export type ErrorCategory = 'API_ERROR' | 'DB_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
export interface ErrorMetadata {
    statusCode?: number;
    cause?: string;
    retryable: boolean;
    context?: Record<string, any>;
}
export declare class AppError extends Error {
    category: ErrorCategory;
    metadata: ErrorMetadata;
    constructor(message: string, category: ErrorCategory, metadata?: ErrorMetadata);
    toJSON(): {
        name: string;
        message: string;
        category: ErrorCategory;
        metadata: ErrorMetadata;
    };
}
export declare class ApiError extends AppError {
    constructor(message: string, statusCode?: number, cause?: string);
    static fromResponse(status: number, text: string): ApiError;
}
export declare class DbError extends AppError {
    constructor(message: string, cause?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class NetworkError extends AppError {
    constructor(message: string, cause?: string);
}
export declare function isRetryable(error: unknown): boolean;
export declare function getErrorCategory(error: unknown): ErrorCategory;
//# sourceMappingURL=errors.d.ts.map