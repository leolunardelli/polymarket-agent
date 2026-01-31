"use strict";
/**
 * Request Tracing Module
 * Provides request correlation IDs and distributed tracing support
 * Integrates with OpenTelemetry-compatible collectors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllTraces = exports.cleanupStaleTraces = exports.getTraceStats = exports.formatTraceHeaders = exports.logSpanEvent = exports.createChildSpan = exports.tracingMiddleware = exports.setTraceHeaders = exports.getTraceContext = exports.createTraceContext = void 0;
const logger_1 = require("./logger");
/**
 * Global trace context storage
 * In production, this would use AsyncLocalStorage for better isolation
 */
const traceContextMap = new Map();
/**
 * Generate a unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Create a new trace context from request headers
 */
function createTraceContext(req) {
    // Check if there's a parent trace context
    const parentTraceId = req.get('X-Trace-ID');
    const parentSpanId = req.get('X-Span-ID');
    const requestId = req.get('X-Request-ID') || `req-${generateId()}`;
    const context = {
        requestId,
        traceId: parentTraceId || `trace-${generateId()}`,
        spanId: `span-${generateId()}`,
        parentSpanId: parentSpanId,
        startTime: Date.now(),
        userId: req.get('X-User-ID'),
        sessionId: req.get('X-Session-ID'),
    };
    traceContextMap.set(requestId, context);
    return context;
}
exports.createTraceContext = createTraceContext;
/**
 * Get the current trace context for a request
 */
function getTraceContext(requestId) {
    return traceContextMap.get(requestId);
}
exports.getTraceContext = getTraceContext;
/**
 * Set trace headers in response for downstream services
 */
function setTraceHeaders(res, context) {
    res.setHeader('X-Trace-ID', context.traceId);
    res.setHeader('X-Span-ID', context.spanId);
    res.setHeader('X-Request-ID', context.requestId);
    if (context.parentSpanId) {
        res.setHeader('X-Parent-Span-ID', context.parentSpanId);
    }
}
exports.setTraceHeaders = setTraceHeaders;
/**
 * Express middleware for request tracing
 */
function tracingMiddleware() {
    return (req, res, next) => {
        const context = createTraceContext(req);
        // Add trace context to request object
        req.traceContext = context;
        // Log request with trace info
        logger_1.logger.debug('Request traced', {
            method: req.method,
            path: req.path,
            traceId: context.traceId,
            spanId: context.spanId,
            requestId: context.requestId,
        });
        // Set trace headers in response
        setTraceHeaders(res, context);
        // Clean up trace context when response finishes
        res.on('finish', () => {
            const duration = Date.now() - context.startTime;
            logger_1.logger.info('Request traced completed', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                traceId: context.traceId,
                spanId: context.spanId,
                requestId: context.requestId,
            });
            // Clean up memory
            traceContextMap.delete(context.requestId);
        });
        next();
    };
}
exports.tracingMiddleware = tracingMiddleware;
/**
 * Create a child span for sub-operations
 */
function createChildSpan(parentContext, operationName) {
    const childContext = {
        requestId: `${parentContext.requestId}-child-${generateId()}`,
        traceId: parentContext.traceId, // Same trace
        spanId: `span-${generateId()}`,
        parentSpanId: parentContext.spanId,
        startTime: Date.now(),
        userId: parentContext.userId,
        sessionId: parentContext.sessionId,
    };
    logger_1.logger.debug('Child span created', {
        operation: operationName,
        parentSpanId: parentContext.spanId,
        spanId: childContext.spanId,
        traceId: parentContext.traceId,
    });
    return childContext;
}
exports.createChildSpan = createChildSpan;
/**
 * Log a span event with timing
 */
function logSpanEvent(context, eventName, duration, attributes) {
    logger_1.logger.debug('Span event', {
        event: eventName,
        spanId: context.spanId,
        traceId: context.traceId,
        duration,
        ...attributes,
    });
}
exports.logSpanEvent = logSpanEvent;
/**
 * Format trace context for propagation to external services
 */
function formatTraceHeaders(context) {
    return {
        'X-Trace-ID': context.traceId,
        'X-Span-ID': context.spanId,
        'X-Request-ID': context.requestId,
        ...(context.parentSpanId && { 'X-Parent-Span-ID': context.parentSpanId }),
        ...(context.userId && { 'X-User-ID': context.userId }),
        ...(context.sessionId && { 'X-Session-ID': context.sessionId }),
    };
}
exports.formatTraceHeaders = formatTraceHeaders;
/**
 * Get trace statistics for monitoring
 */
function getTraceStats() {
    return {
        activeTraces: traceContextMap.size,
        totalTracesCreated: traceContextMap.size, // Approximation
    };
}
exports.getTraceStats = getTraceStats;
/**
 * Clean up stale trace contexts (older than 1 hour)
 */
function cleanupStaleTraces(maxAgeMs = 60 * 60 * 1000) {
    const now = Date.now();
    let cleanedCount = 0;
    traceContextMap.forEach((context, requestId) => {
        if (now - context.startTime > maxAgeMs) {
            traceContextMap.delete(requestId);
            cleanedCount++;
        }
    });
    if (cleanedCount > 0) {
        logger_1.logger.debug('Cleaned up stale traces', { count: cleanedCount });
    }
    return cleanedCount;
}
exports.cleanupStaleTraces = cleanupStaleTraces;
/**
 * Clear all trace contexts (useful for testing)
 */
function clearAllTraces() {
    traceContextMap.clear();
}
exports.clearAllTraces = clearAllTraces;
//# sourceMappingURL=tracing.js.map