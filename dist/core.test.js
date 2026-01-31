"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cache_1 = require("../src/cache");
const monitoring_1 = require("../src/monitoring");
const tracing_1 = require("../src/tracing");
(0, vitest_1.describe)('Cache Module', () => {
    let cache;
    (0, vitest_1.beforeEach)(() => {
        cache = new cache_1.ThreadSafeCache(100, 1000);
    });
    (0, vitest_1.afterEach)(async () => {
        await cache.clear();
    });
    (0, vitest_1.it)('should store and retrieve values', async () => {
        await cache.set('key1', 'value1');
        (0, vitest_1.expect)(cache.get('key1')).toBe('value1');
    });
    (0, vitest_1.it)('should return undefined for missing keys', () => {
        (0, vitest_1.expect)(cache.get('missing')).toBeUndefined();
    });
    (0, vitest_1.it)('should expire values after TTL', async () => {
        const shortTTL = 100;
        await cache.set('key1', 'value1', shortTTL);
        (0, vitest_1.expect)(cache.get('key1')).toBe('value1');
        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, shortTTL + 50));
        (0, vitest_1.expect)(cache.get('key1')).toBeUndefined();
    });
    (0, vitest_1.it)('should enforce max size with LRU eviction', async () => {
        const smallCache = new cache_1.ThreadSafeCache(2, 60000);
        await smallCache.set('key1', 'value1');
        await smallCache.set('key2', 'value2');
        // Cache is now full (size 2, maxSize 2)
        // Adding key3 should trigger eviction
        // Without accessing key1, key1 is LRU and should be evicted
        await smallCache.set('key3', 'value3');
        (0, vitest_1.expect)(smallCache.get('key1')).toBeUndefined(); // Evicted (least recently used)
        (0, vitest_1.expect)(smallCache.get('key2')).toBe('value2');
        (0, vitest_1.expect)(smallCache.get('key3')).toBe('value3');
    });
    (0, vitest_1.it)('should handle concurrent operations', async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(cache.set(`key${i}`, `value${i}`));
        }
        await Promise.all(promises);
        for (let i = 0; i < 10; i++) {
            (0, vitest_1.expect)(cache.get(`key${i}`)).toBe(`value${i}`);
        }
    });
    (0, vitest_1.it)('should get cache stats', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        const stats = cache.getStats();
        (0, vitest_1.expect)(stats.size).toBe(2);
        (0, vitest_1.expect)(stats.maxSize).toBe(100);
        (0, vitest_1.expect)(stats.utilizationPercent).toBe(2);
    });
    (0, vitest_1.it)('should cleanup expired entries', async () => {
        await cache.set('key1', 'value1', 100);
        await cache.set('key2', 'value2', 100);
        await cache.set('key3', 'value3', 60000);
        await new Promise((resolve) => setTimeout(resolve, 150));
        const cleaned = await cache.cleanup();
        (0, vitest_1.expect)(cleaned).toBe(2);
        (0, vitest_1.expect)(cache.get('key3')).toBe('value3');
    });
});
(0, vitest_1.describe)('Metrics Module', () => {
    (0, vitest_1.beforeEach)(() => {
        const metrics = (0, monitoring_1.getMetrics)();
        metrics.clear();
    });
    (0, vitest_1.it)('should record API metrics', () => {
        (0, monitoring_1.recordAPIMetrics)('GET /api/markets', 100, 200, 0);
        (0, monitoring_1.recordAPIMetrics)('GET /api/markets', 150, 200, 1);
        const metrics = (0, monitoring_1.getMetrics)();
        const stats = metrics.getMetricStats('api_call_duration_ms');
        (0, vitest_1.expect)(stats).not.toBeNull();
        (0, vitest_1.expect)(stats.count).toBe(2);
        (0, vitest_1.expect)(stats.min).toBe(100);
        (0, vitest_1.expect)(stats.max).toBe(150);
    });
    (0, vitest_1.it)('should record database metrics', () => {
        (0, monitoring_1.recordDatabaseMetrics)('SELECT', 50, 10, true);
        (0, monitoring_1.recordDatabaseMetrics)('INSERT', 100, 1, true);
        const metrics = (0, monitoring_1.getMetrics)();
        const stats = metrics.getMetricStats('db_operation_duration_ms');
        (0, vitest_1.expect)(stats).not.toBeNull();
        (0, vitest_1.expect)(stats.count).toBe(2);
    });
    (0, vitest_1.it)('should record cache metrics', () => {
        (0, monitoring_1.recordCacheMetrics)('get', true);
        (0, monitoring_1.recordCacheMetrics)('get', true);
        (0, monitoring_1.recordCacheMetrics)('get', false);
        (0, monitoring_1.recordCacheMetrics)('set', false);
        const metrics = (0, monitoring_1.getMetrics)();
        const prometheusMetrics = metrics.getPrometheusMetrics();
        (0, vitest_1.expect)(prometheusMetrics).toContain('cache_hits_total');
        (0, vitest_1.expect)(prometheusMetrics).toContain('cache_operations_total');
    });
    (0, vitest_1.it)('should generate prometheus metrics', () => {
        (0, monitoring_1.recordAPIMetrics)('GET /api/test', 100, 200);
        const metrics = (0, monitoring_1.getMetrics)();
        const prometheusMetrics = metrics.getPrometheusMetrics();
        (0, vitest_1.expect)(prometheusMetrics).toContain('api_call_duration_ms');
        (0, vitest_1.expect)(prometheusMetrics).toContain('# TYPE');
        (0, vitest_1.expect)(prometheusMetrics).toContain('histogram');
    });
});
(0, vitest_1.describe)('Tracing Module', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, tracing_1.clearAllTraces)();
    });
    (0, vitest_1.it)('should create trace context', () => {
        const mockReq = {
            get: (header) => {
                const headers = {
                    'X-Request-ID': 'req-123',
                    'X-User-ID': 'user-456',
                };
                return headers[header];
            },
        };
        const context = (0, tracing_1.createTraceContext)(mockReq);
        (0, vitest_1.expect)(context.requestId).toBe('req-123');
        (0, vitest_1.expect)(context.userId).toBe('user-456');
        (0, vitest_1.expect)(context.traceId).toBeDefined();
        (0, vitest_1.expect)(context.spanId).toBeDefined();
    });
    (0, vitest_1.it)('should retrieve trace context', () => {
        const mockReq = {
            get: (header) => undefined,
        };
        const context = (0, tracing_1.createTraceContext)(mockReq);
        const retrieved = (0, tracing_1.getTraceContext)(context.requestId);
        (0, vitest_1.expect)(retrieved).toEqual(context);
    });
    (0, vitest_1.it)('should format trace headers for propagation', () => {
        const mockReq = {
            get: (header) => undefined,
        };
        const context = (0, tracing_1.createTraceContext)(mockReq);
        const headers = (0, tracing_1.formatTraceHeaders)(context);
        (0, vitest_1.expect)(headers['X-Trace-ID']).toBe(context.traceId);
        (0, vitest_1.expect)(headers['X-Span-ID']).toBe(context.spanId);
        (0, vitest_1.expect)(headers['X-Request-ID']).toBe(context.requestId);
    });
    (0, vitest_1.it)('should cleanup stale traces', () => {
        const mockReq = {
            get: (header) => undefined,
        };
        // Create some old contexts
        const context1 = (0, tracing_1.createTraceContext)(mockReq);
        context1.startTime = Date.now() - 65 * 60 * 1000; // 65 minutes old
        const context2 = (0, tracing_1.createTraceContext)(mockReq);
        // context2 is fresh
        const cleaned = (0, tracing_1.cleanupStaleTraces)(60 * 60 * 1000); // 1 hour threshold
        (0, vitest_1.expect)(cleaned).toBeGreaterThan(0);
        const retrieved = (0, tracing_1.getTraceContext)(context2.requestId);
        (0, vitest_1.expect)(retrieved).toBeDefined(); // Fresh context should remain
    });
});
(0, vitest_1.describe)('Integration Tests', () => {
    (0, vitest_1.it)('should handle request lifecycle with cache, metrics, and tracing', async () => {
        const cache = new cache_1.ThreadSafeCache(100, 10000);
        const metrics = (0, monitoring_1.getMetrics)();
        // Simulate request
        const mockReq = {
            get: (header) => undefined,
            method: 'GET',
            path: '/api/markets',
        };
        (0, tracing_1.clearAllTraces)();
        metrics.clear();
        const context = (0, tracing_1.createTraceContext)(mockReq);
        // Simulate API call
        const startTime = Date.now();
        (0, monitoring_1.recordAPIMetrics)('GET /api/markets', 100, 200, 0);
        const duration = Date.now() - startTime;
        // Cache the result
        await cache.set(`${mockReq.method}:${mockReq.path}`, { markets: [] }, 10000);
        // Verify everything is tracked
        (0, vitest_1.expect)((0, tracing_1.getTraceContext)(context.requestId)).toBeDefined();
        (0, vitest_1.expect)(cache.get(`${mockReq.method}:${mockReq.path}`)).toEqual({ markets: [] });
        const stats = metrics.getMetricStats('api_call_duration_ms');
        (0, vitest_1.expect)(stats).not.toBeNull();
        (0, vitest_1.expect)(stats.count).toBe(1);
    });
});
//# sourceMappingURL=core.test.js.map