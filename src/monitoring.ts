/**
 * Metrics Module - Prometheus Compatible Metrics Collection
 * Tracks request metrics, database performance, and application health
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface MetricValue {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricValue[]> = new Map();
  private requestStartTimes: Map<string, number> = new Map();
  private readonly MAX_METRIC_HISTORY = 10000;

  /**
   * Record a request start
   */
  public recordRequestStart(requestId: string): void {
    this.requestStartTimes.set(requestId, Date.now());
  }

  /**
   * Record a request completion
   */
  public recordRequestEnd(
    requestId: string,
    method: string,
    path: string,
    statusCode: number
  ): void {
    const startTime = this.requestStartTimes.get(requestId);
    if (!startTime) return;

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
  public incrementCounter(name: string, labels?: Record<string, string>): void {
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
    } else {
      metrics[metrics.length - 1].value++;
    }

    this.metrics.set(key, this.pruneMetrics(metrics));
  }

  /**
   * Record a gauge metric (point-in-time measurement)
   */
  public recordGauge(name: string, value: number, labels?: Record<string, string>): void {
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
  public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
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
  public getPrometheusMetrics(): string {
    const lines: string[] = [];
    const now = Date.now();

    this.metrics.forEach((metrics, key) => {
      if (metrics.length === 0) return;

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
  public getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const matchingMetrics: number[] = [];

    this.metrics.forEach((metrics) => {
      metrics.forEach((metric) => {
        if (metric.name === name) {
          matchingMetrics.push(metric.value);
        }
      });
    });

    if (matchingMetrics.length === 0) return null;

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
  public clear(): void {
    this.metrics.clear();
    this.requestStartTimes.clear();
  }

  /**
   * Prune metric history to avoid unbounded growth
   */
  private pruneMetrics(metrics: MetricValue[]): MetricValue[] {
    if (metrics.length > this.MAX_METRIC_HISTORY) {
      return metrics.slice(-this.MAX_METRIC_HISTORY);
    }
    return metrics;
  }

  /**
   * Format a metric in Prometheus text format
   */
  private formatPrometheusMetric(metric: MetricValue): string {
    const labels = metric.labels ? this.formatLabels(metric.labels) : '';
    const name = metric.name;
    return `${name}${labels} ${metric.value}`;
  }

  /**
   * Format Prometheus labels
   */
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';

    const parts = Object.entries(labels).map(
      ([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`
    );
    return `{${parts.join(',')}}`;
  }

  /**
   * Get metric key with labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
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
let metricsInstance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

/**
 * Express middleware for metrics collection
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || `req-${Date.now()}`;
    const metrics = getMetrics();

    metrics.recordRequestStart(requestId);

    res.on('finish', () => {
      metrics.recordRequestEnd(requestId, req.method, req.path, res.statusCode);
    });

    next();
  };
}

/**
 * Record database metrics
 */
export function recordDatabaseMetrics(
  operation: string,
  duration: number,
  rowsAffected?: number,
  success: boolean = true
): void {
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

/**
 * Record cache metrics
 */
export function recordCacheMetrics(
  operation: 'get' | 'set' | 'delete',
  hit: boolean = false
): void {
  const metrics = getMetrics();

  metrics.incrementCounter('cache_operations_total', {
    operation,
    hit: String(hit),
  });

  if (operation === 'get' && hit) {
    metrics.incrementCounter('cache_hits_total');
  }
}

/**
 * Record API call metrics
 */
export function recordAPIMetrics(
  endpoint: string,
  duration: number,
  statusCode: number,
  retries: number = 0
): void {
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
