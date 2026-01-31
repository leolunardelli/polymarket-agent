/**
 * Metrics Module - Prometheus Compatible Metrics Collection
 * Tracks request metrics, database performance, and application health
 */
import { Request, Response, NextFunction } from 'express';
export interface MetricValue {
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: Record<string, string>;
    timestamp: number;
}
declare class MetricsCollector {
    private metrics;
    private requestStartTimes;
    private readonly MAX_METRIC_HISTORY;
    /**
     * Record a request start
     */
    recordRequestStart(requestId: string): void;
    /**
     * Record a request completion
     */
    recordRequestEnd(requestId: string, method: string, path: string, statusCode: number): void;
    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, labels?: Record<string, string>): void;
    /**
     * Record a gauge metric (point-in-time measurement)
     */
    recordGauge(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Record a histogram metric (distribution of values)
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Get all metrics in Prometheus text format
     */
    getPrometheusMetrics(): string;
    /**
     * Get summary statistics for a metric
     */
    getMetricStats(name: string): {
        count: number;
        min: number;
        max: number;
        avg: number;
        p50: number;
        p95: number;
        p99: number;
    } | null;
    /**
     * Clear all metrics
     */
    clear(): void;
    /**
     * Prune metric history to avoid unbounded growth
     */
    private pruneMetrics;
    /**
     * Format a metric in Prometheus text format
     */
    private formatPrometheusMetric;
    /**
     * Format Prometheus labels
     */
    private formatLabels;
    /**
     * Get metric key with labels
     */
    private getMetricKey;
}
export declare function getMetrics(): MetricsCollector;
/**
 * Express middleware for metrics collection
 */
export declare function metricsMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Record database metrics
 */
export declare function recordDatabaseMetrics(operation: string, duration: number, rowsAffected?: number, success?: boolean): void;
/**
 * Record cache metrics
 */
export declare function recordCacheMetrics(operation: 'get' | 'set' | 'delete', hit?: boolean): void;
/**
 * Record API call metrics
 */
export declare function recordAPIMetrics(endpoint: string, duration: number, statusCode: number, retries?: number): void;
export {};
//# sourceMappingURL=monitoring.d.ts.map