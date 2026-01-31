"use strict";
/**
 * Metrics Module - Prometheus Compatible Metrics Collection
 * Tracks request metrics, database performance, and application health
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAPIMetrics = exports.recordCacheMetrics = exports.recordDatabaseMetrics = exports.metricsMiddleware = exports.getMetrics = void 0;
class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.requestStartTimes = new Map();
        this.MAX_METRIC_HISTORY = 10000;
    }
    /**
     * Record a request start
     */
    recordRequestStart(requestId) {
        this.requestStartTimes.set(requestId, Date.now());
    }
    /**
     * Record a request completion
     */
    recordRequestEnd(requestId, method, path, statusCode) {
        const startTime = this.requestStartTimes.get(requestId);
        if (!startTime)
            return;
        const duration = Date.now() - startTime;
        // Record histogram for request duration
        this.recordHistogram('http_request_duration_ms', duration, {
            method,
            path,
            status: String(statusCode),
        });
        // Record counter for requests
        this.incrementCounter('http_requests_total', {
            method,
            path,
            status: String(statusCode),
        });
        this.requestStartTimes.delete(requestId);
    }
    /**
     * Increment a counter metric
     */
    incrementCounter(name, labels) {
        const key = this.getMetricKey(name, labels);
        const metrics = this.metrics.get(key) || [];
        if (metrics.length === 0 || metrics[metrics.length - 1].type !== 'counter') {
            metrics.push({
                name,
                type: 'counter',
                value: 1,
                labels,
                timestamp: Date.now(),
            });
        }
        else {
            metrics[metrics.length - 1].value++;
        }
        this.metrics.set(key, this.pruneMetrics(metrics));
    }
    /**
     * Record a gauge metric (point-in-time measurement)
     */
    recordGauge(name, value, labels) {
        const key = this.getMetricKey(name, labels);
        const metrics = this.metrics.get(key) || [];
        metrics.push({
            name,
            type: 'gauge',
            value,
            labels,
            timestamp: Date.now(),
        });
        this.metrics.set(key, this.pruneMetrics(metrics));
    }
    /**
     * Record a histogram metric (distribution of values)
     */
    recordHistogram(name, value, labels) {
        const key = this.getMetricKey(name, labels);
        const metrics = this.metrics.get(key) || [];
        metrics.push({
            name,
            type: 'histogram',
            value,
            labels,
            timestamp: Date.now(),
        });
        this.metrics.set(key, this.pruneMetrics(metrics));
    }
    /**
     * Get all metrics in Prometheus text format
     */
    getPrometheusMetrics() {
        const lines = [];
        const now = Date.now();
        this.metrics.forEach((metrics, key) => {
            if (metrics.length === 0)
                return;
            const latestMetric = metrics[metrics.length - 1];
            const metricLine = this.formatPrometheusMetric(latestMetric);
            if (!lines.includes(`# HELP ${latestMetric.name}`)) {
                lines.push(`# HELP ${latestMetric.name} Application metric ${latestMetric.name}`);
                lines.push(`# TYPE ${latestMetric.name} ${latestMetric.type}`);
            }
            lines.push(metricLine);
        });
        return lines.join('\n') + '\n';
    }
    /**
     * Get summary statistics for a metric
     */
    getMetricStats(name) {
        const matchingMetrics = [];
        this.metrics.forEach((metrics) => {
            metrics.forEach((metric) => {
                if (metric.name === name) {
                    matchingMetrics.push(metric.value);
                }
            });
        });
        if (matchingMetrics.length === 0)
            return null;
        const sorted = [...matchingMetrics].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        return {
            count: sorted.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: sum / sorted.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
        };
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
        this.requestStartTimes.clear();
    }
    /**
     * Prune metric history to avoid unbounded growth
     */
    pruneMetrics(metrics) {
        if (metrics.length > this.MAX_METRIC_HISTORY) {
            return metrics.slice(-this.MAX_METRIC_HISTORY);
        }
        return metrics;
    }
    /**
     * Format a metric in Prometheus text format
     */
    formatPrometheusMetric(metric) {
        const labels = metric.labels ? this.formatLabels(metric.labels) : '';
        const name = metric.name;
        return `${name}${labels} ${metric.value}`;
    }
    /**
     * Format Prometheus labels
     */
    formatLabels(labels) {
        if (Object.keys(labels).length === 0)
            return '';
        const parts = Object.entries(labels).map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`);
        return `{${parts.join(',')}}`;
    }
    /**
     * Get metric key with labels
     */
    getMetricKey(name, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return name;
        }
        const labelStr = Object.entries(labels)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
}
// Export singleton instance
let metricsInstance = null;
function getMetrics() {
    if (!metricsInstance) {
        metricsInstance = new MetricsCollector();
    }
    return metricsInstance;
}
exports.getMetrics = getMetrics;
/**
 * Express middleware for metrics collection
 */
function metricsMiddleware() {
    return (req, res, next) => {
        const requestId = req.requestId || `req-${Date.now()}`;
        const metrics = getMetrics();
        metrics.recordRequestStart(requestId);
        res.on('finish', () => {
            metrics.recordRequestEnd(requestId, req.method, req.path, res.statusCode);
        });
        next();
    };
}
exports.metricsMiddleware = metricsMiddleware;
/**
 * Record database metrics
 */
function recordDatabaseMetrics(operation, duration, rowsAffected, success = true) {
    const metrics = getMetrics();
    metrics.recordHistogram('db_operation_duration_ms', duration, {
        operation,
        success: String(success),
    });
    if (rowsAffected !== undefined) {
        metrics.recordGauge('db_rows_affected', rowsAffected, { operation });
    }
    metrics.incrementCounter('db_operations_total', {
        operation,
        success: String(success),
    });
}
exports.recordDatabaseMetrics = recordDatabaseMetrics;
/**
 * Record cache metrics
 */
function recordCacheMetrics(operation, hit = false) {
    const metrics = getMetrics();
    metrics.incrementCounter('cache_operations_total', {
        operation,
        hit: String(hit),
    });
    if (operation === 'get' && hit) {
        metrics.incrementCounter('cache_hits_total');
    }
}
exports.recordCacheMetrics = recordCacheMetrics;
/**
 * Record API call metrics
 */
function recordAPIMetrics(endpoint, duration, statusCode, retries = 0) {
    const metrics = getMetrics();
    metrics.recordHistogram('api_call_duration_ms', duration, {
        endpoint,
        status: String(statusCode),
    });
    metrics.incrementCounter('api_calls_total', {
        endpoint,
        status: String(statusCode),
    });
    if (retries > 0) {
        metrics.recordGauge('api_retries', retries, { endpoint });
    }
}
exports.recordAPIMetrics = recordAPIMetrics;
//# sourceMappingURL=monitoring.js.map