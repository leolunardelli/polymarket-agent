import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThreadSafeCache } from '../src/cache';
import { getMetrics, recordAPIMetrics, recordDatabaseMetrics, recordCacheMetrics } from '../src/monitoring';
import { createTraceContext, getTraceContext, formatTraceHeaders, cleanupStaleTraces, clearAllTraces } from '../src/tracing';
import { Express, Request, Response } from 'express';

describe('Cache Module', () => {
  let cache: ThreadSafeCache<string>;

  beforeEach(() => {
    cache = new ThreadSafeCache<string>(100, 1000);
  });

  afterEach(async () => {
    await cache.clear();
  });

  it('should store and retrieve values', async () => {
    await cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should expire values after TTL', async () => {
    const shortTTL = 100;
    await cache.set('key1', 'value1', shortTTL);
    expect(cache.get('key1')).toBe('value1');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, shortTTL + 50));
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should enforce max size with LRU eviction', async () => {
    const smallCache = new ThreadSafeCache<string>(2, 60000);

    await smallCache.set('key1', 'value1');
    await smallCache.set('key2', 'value2');

    // Cache is now full (size 2, maxSize 2)
    // Adding key3 should trigger eviction
    // Without accessing key1, key1 is LRU and should be evicted
    await smallCache.set('key3', 'value3');

    expect(smallCache.get('key1')).toBeUndefined(); // Evicted (least recently used)
    expect(smallCache.get('key2')).toBe('value2');
    expect(smallCache.get('key3')).toBe('value3');
  });

  it('should handle concurrent operations', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(cache.set(`key${i}`, `value${i}`));
    }
    await Promise.all(promises);

    for (let i = 0; i < 10; i++) {
      expect(cache.get(`key${i}`)).toBe(`value${i}`);
    }
  });

  it('should get cache stats', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(100);
    expect(stats.utilizationPercent).toBe(2);
  });

  it('should cleanup expired entries', async () => {
    await cache.set('key1', 'value1', 100);
    await cache.set('key2', 'value2', 100);
    await cache.set('key3', 'value3', 60000);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const cleaned = await cache.cleanup();
    expect(cleaned).toBe(2);
    expect(cache.get('key3')).toBe('value3');
  });
});

describe('Metrics Module', () => {
  beforeEach(() => {
    const metrics = getMetrics();
    metrics.clear();
  });

  it('should record API metrics', () => {
    recordAPIMetrics('GET /api/markets', 100, 200, 0);
    recordAPIMetrics('GET /api/markets', 150, 200, 1);

    const metrics = getMetrics();
    const stats = metrics.getMetricStats('api_call_duration_ms');

    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(2);
    expect(stats!.min).toBe(100);
    expect(stats!.max).toBe(150);
  });

  it('should record database metrics', () => {
    recordDatabaseMetrics('SELECT', 50, 10, true);
    recordDatabaseMetrics('INSERT', 100, 1, true);

    const metrics = getMetrics();
    const stats = metrics.getMetricStats('db_operation_duration_ms');

    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(2);
  });

  it('should record cache metrics', () => {
    recordCacheMetrics('get', true);
    recordCacheMetrics('get', true);
    recordCacheMetrics('get', false);
    recordCacheMetrics('set', false);

    const metrics = getMetrics();
    const prometheusMetrics = metrics.getPrometheusMetrics();

    expect(prometheusMetrics).toContain('cache_hits_total');
    expect(prometheusMetrics).toContain('cache_operations_total');
  });

  it('should generate prometheus metrics', () => {
    recordAPIMetrics('GET /api/test', 100, 200);

    const metrics = getMetrics();
    const prometheusMetrics = metrics.getPrometheusMetrics();

    expect(prometheusMetrics).toContain('api_call_duration_ms');
    expect(prometheusMetrics).toContain('# TYPE');
    expect(prometheusMetrics).toContain('histogram');
  });
});

describe('Tracing Module', () => {
  beforeEach(() => {
    clearAllTraces();
  });

  it('should create trace context', () => {
    const mockReq = {
      get: (header: string) => {
        const headers: Record<string, string> = {
          'X-Request-ID': 'req-123',
          'X-User-ID': 'user-456',
        };
        return headers[header];
      },
    } as any;

    const context = createTraceContext(mockReq);

    expect(context.requestId).toBe('req-123');
    expect(context.userId).toBe('user-456');
    expect(context.traceId).toBeDefined();
    expect(context.spanId).toBeDefined();
  });

  it('should retrieve trace context', () => {
    const mockReq = {
      get: (header: string) => undefined,
    } as any;

    const context = createTraceContext(mockReq);
    const retrieved = getTraceContext(context.requestId);

    expect(retrieved).toEqual(context);
  });

  it('should format trace headers for propagation', () => {
    const mockReq = {
      get: (header: string) => undefined,
    } as any;

    const context = createTraceContext(mockReq);
    const headers = formatTraceHeaders(context);

    expect(headers['X-Trace-ID']).toBe(context.traceId);
    expect(headers['X-Span-ID']).toBe(context.spanId);
    expect(headers['X-Request-ID']).toBe(context.requestId);
  });

  it('should cleanup stale traces', () => {
    const mockReq = {
      get: (header: string) => undefined,
    } as any;

    // Create some old contexts
    const context1 = createTraceContext(mockReq);
    (context1 as any).startTime = Date.now() - 65 * 60 * 1000; // 65 minutes old

    const context2 = createTraceContext(mockReq);
    // context2 is fresh

    const cleaned = cleanupStaleTraces(60 * 60 * 1000); // 1 hour threshold
    expect(cleaned).toBeGreaterThan(0);

    const retrieved = getTraceContext(context2.requestId);
    expect(retrieved).toBeDefined(); // Fresh context should remain
  });
});

describe('Integration Tests', () => {
  it('should handle request lifecycle with cache, metrics, and tracing', async () => {
    const cache = new ThreadSafeCache<string>(100, 10000);
    const metrics = getMetrics();

    // Simulate request
    const mockReq = {
      get: (header: string) => undefined,
      method: 'GET',
      path: '/api/markets',
    } as any;

    clearAllTraces();
    metrics.clear();

    const context = createTraceContext(mockReq);

    // Simulate API call
    const startTime = Date.now();
    recordAPIMetrics('GET /api/markets', 100, 200, 0);
    const duration = Date.now() - startTime;

    // Cache the result
    await cache.set(`${mockReq.method}:${mockReq.path}`, { markets: [] }, 10000);

    // Verify everything is tracked
    expect(getTraceContext(context.requestId)).toBeDefined();
    expect(cache.get(`${mockReq.method}:${mockReq.path}`)).toEqual({ markets: [] });

    const stats = metrics.getMetricStats('api_call_duration_ms');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(1);
  });
});
