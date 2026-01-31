/**
 * Request Tracing Module
 * Provides request correlation IDs and distributed tracing support
 * Integrates with OpenTelemetry-compatible collectors
 */
import { Request, Response, NextFunction } from 'express';
export interface TraceContext {
    requestId: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    startTime: number;
    userId?: string;
    sessionId?: string;
}
/**
 * Create a new trace context from request headers
 */
export declare function createTraceContext(req: Request): TraceContext;
/**
 * Get the current trace context for a request
 */
export declare function getTraceContext(requestId: string): TraceContext | undefined;
/**
 * Set trace headers in response for downstream services
 */
export declare function setTraceHeaders(res: Response, context: TraceContext): void;
/**
 * Express middleware for request tracing
 */
export declare function tracingMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Create a child span for sub-operations
 */
export declare function createChildSpan(parentContext: TraceContext, operationName: string): TraceContext;
/**
 * Log a span event with timing
 */
export declare function logSpanEvent(context: TraceContext, eventName: string, duration: number, attributes?: Record<string, any>): void;
/**
 * Format trace context for propagation to external services
 */
export declare function formatTraceHeaders(context: TraceContext): Record<string, string>;
/**
 * Get trace statistics for monitoring
 */
export declare function getTraceStats(): {
    activeTraces: number;
    totalTracesCreated: number;
};
/**
 * Clean up stale trace contexts (older than 1 hour)
 */
export declare function cleanupStaleTraces(maxAgeMs?: number): number;
/**
 * Clear all trace contexts (useful for testing)
 */
export declare function clearAllTraces(): void;
//# sourceMappingURL=tracing.d.ts.map