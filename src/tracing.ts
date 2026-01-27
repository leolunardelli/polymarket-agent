/**
 * Request Tracing Module
 * Provides request correlation IDs and distributed tracing support
 * Integrates with OpenTelemetry-compatible collectors
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

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
 * Global trace context storage
 * In production, this would use AsyncLocalStorage for better isolation
 */
const traceContextMap = new Map<string, TraceContext>();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new trace context from request headers
 */
export function createTraceContext(req: Request): TraceContext {
  // Check if there's a parent trace context
  const parentTraceId = req.get('X-Trace-ID');
  const parentSpanId = req.get('X-Span-ID');
  const requestId = req.get('X-Request-ID') || `req-${generateId()}`;

  const context: TraceContext = {
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

/**
 * Get the current trace context for a request
 */
export function getTraceContext(requestId: string): TraceContext | undefined {
  return traceContextMap.get(requestId);
}

/**
 * Set trace headers in response for downstream services
 */
export function setTraceHeaders(res: Response, context: TraceContext): void {
  res.setHeader('X-Trace-ID', context.traceId);
  res.setHeader('X-Span-ID', context.spanId);
  res.setHeader('X-Request-ID', context.requestId);

  if (context.parentSpanId) {
    res.setHeader('X-Parent-Span-ID', context.parentSpanId);
  }
}

/**
 * Express middleware for request tracing
 */
export function tracingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = createTraceContext(req);

    // Add trace context to request object
    (req as any).traceContext = context;

    // Log request with trace info
    logger.debug('Request traced', {
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

      logger.info('Request traced completed', {
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

/**
 * Create a child span for sub-operations
 */
export function createChildSpan(parentContext: TraceContext, operationName: string): TraceContext {
  const childContext: TraceContext = {
    requestId: `${parentContext.requestId}-child-${generateId()}`,
    traceId: parentContext.traceId, // Same trace
    spanId: `span-${generateId()}`,
    parentSpanId: parentContext.spanId,
    startTime: Date.now(),
    userId: parentContext.userId,
    sessionId: parentContext.sessionId,
  };

  logger.debug('Child span created', {
    operation: operationName,
    parentSpanId: parentContext.spanId,
    spanId: childContext.spanId,
    traceId: parentContext.traceId,
  });

  return childContext;
}

/**
 * Log a span event with timing
 */
export function logSpanEvent(
  context: TraceContext,
  eventName: string,
  duration: number,
  attributes?: Record<string, any>
): void {
  logger.debug('Span event', {
    event: eventName,
    spanId: context.spanId,
    traceId: context.traceId,
    duration,
    ...attributes,
  });
}

/**
 * Format trace context for propagation to external services
 */
export function formatTraceHeaders(context: TraceContext): Record<string, string> {
  return {
    'X-Trace-ID': context.traceId,
    'X-Span-ID': context.spanId,
    'X-Request-ID': context.requestId,
    ...(context.parentSpanId && { 'X-Parent-Span-ID': context.parentSpanId }),
    ...(context.userId && { 'X-User-ID': context.userId }),
    ...(context.sessionId && { 'X-Session-ID': context.sessionId }),
  };
}

/**
 * Get trace statistics for monitoring
 */
export function getTraceStats(): {
  activeTraces: number;
  totalTracesCreated: number;
} {
  return {
    activeTraces: traceContextMap.size,
    totalTracesCreated: traceContextMap.size, // Approximation
  };
}

/**
 * Clean up stale trace contexts (older than 1 hour)
 */
export function cleanupStaleTraces(maxAgeMs: number = 60 * 60 * 1000): number {
  const now = Date.now();
  let cleanedCount = 0;

  traceContextMap.forEach((context, requestId) => {
    if (now - context.startTime > maxAgeMs) {
      traceContextMap.delete(requestId);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.debug('Cleaned up stale traces', { count: cleanedCount });
  }

  return cleanedCount;
}

/**
 * Clear all trace contexts (useful for testing)
 */
export function clearAllTraces(): void {
  traceContextMap.clear();
}
