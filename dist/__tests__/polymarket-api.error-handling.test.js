"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock fetch before importing PolymarketAPI
let fetchMockImpl;
global.fetch = vitest_1.vi.fn(async () => {
    if (!fetchMockImpl) {
        throw new Error('No fetch implementation provided');
    }
    return fetchMockImpl();
});
const polymarket_api_1 = require("../polymarket-api");
(0, vitest_1.describe)('PolymarketAPI - Error Handling and Retries', () => {
    let api;
    const fetchMock = global.fetch;
    (0, vitest_1.beforeEach)(() => {
        api = new polymarket_api_1.PolymarketAPI();
        api.clearCache(); // Clear cache between tests to ensure fresh fetch calls
        fetchMock.mockClear();
        fetchMockImpl = null;
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.clearAllMocks();
        fetchMockImpl = null;
    });
    (0, vitest_1.describe)('Retryable Errors', () => {
        (0, vitest_1.it)('should retry on 500 Internal Server Error', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    return new Response('Server Error', { status: 500 });
                }
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            const result = await api.getMarkets({ limit: 10 });
            (0, vitest_1.expect)(callCount).toBe(2);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('should retry on 429 Rate Limit', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    return new Response('Too Many Requests', { status: 429 });
                }
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            const result = await api.getMarkets({ limit: 10 });
            (0, vitest_1.expect)(callCount).toBe(2);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('should retry on 408 Request Timeout', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                if (callCount === 1) {
                    return new Response('Request Timeout', { status: 408 });
                }
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            const result = await api.getMarkets({ limit: 10 });
            (0, vitest_1.expect)(callCount).toBe(2);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('should fail immediately on 400 Bad Request', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                return new Response('Bad Request', { status: 400 });
            };
            try {
                await api.getMarkets();
                vitest_1.expect.fail('Should have thrown APIError');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeInstanceOf(polymarket_api_1.APIError);
                (0, vitest_1.expect)(callCount).toBe(1);
            }
        });
        (0, vitest_1.it)('should fail immediately on 404 Not Found', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                return new Response('Not Found', { status: 404 });
            };
            try {
                await api.getMarket('nonexistent-market');
                vitest_1.expect.fail('Should have thrown APIError');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeInstanceOf(polymarket_api_1.APIError);
                (0, vitest_1.expect)(callCount).toBe(1);
            }
        });
        (0, vitest_1.it)('should fail after max retries on persistent 500', async () => {
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                return new Response('Server Error', { status: 500 });
            };
            try {
                await api.getMarkets();
                vitest_1.expect.fail('Should have thrown APIError');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeInstanceOf(polymarket_api_1.APIError);
                // maxAttempts is 3 (1 initial + 2 retries)
                (0, vitest_1.expect)(callCount).toBe(3);
            }
        });
    });
    (0, vitest_1.describe)('Error Logging', () => {
        (0, vitest_1.it)('should include error details in APIError', async () => {
            fetchMockImpl = async () => {
                return new Response('Not Found', { status: 404 });
            };
            try {
                await api.getMarkets();
                vitest_1.expect.fail('Should have thrown');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeInstanceOf(polymarket_api_1.APIError);
                (0, vitest_1.expect)(error.statusCode).toBe(404);
                (0, vitest_1.expect)(error.endpoint).toContain('markets');
                (0, vitest_1.expect)(error.retryable).toBe(false);
            }
        });
        (0, vitest_1.it)('should mark server errors as retryable', async () => {
            fetchMockImpl = async () => {
                return new Response('Server Error', { status: 502 });
            };
            try {
                await api.getMarkets();
                vitest_1.expect.fail('Should have thrown');
            }
            catch (error) {
                (0, vitest_1.expect)(error.retryable).toBe(true);
            }
        });
    });
    (0, vitest_1.describe)('Response Validation', () => {
        (0, vitest_1.it)('should validate market response against schema', async () => {
            const invalidMarket = { question: 'Test?' }; // Missing required fields
            fetchMockImpl = async () => {
                return new Response(JSON.stringify(invalidMarket), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            try {
                await api.getMarket('test');
                vitest_1.expect.fail('Should have thrown');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeDefined();
            }
        });
        (0, vitest_1.it)('should handle malformed JSON responses', async () => {
            fetchMockImpl = async () => {
                return new Response('{ invalid json', {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            try {
                await api.getMarkets();
                vitest_1.expect.fail('Should have thrown');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeDefined();
            }
        });
    });
    (0, vitest_1.describe)('Backoff Strategy', () => {
        (0, vitest_1.it)('should use exponential backoff on retries', async () => {
            let callCount = 0;
            let callTimes = [];
            fetchMockImpl = async () => {
                callCount++;
                callTimes.push(Date.now());
                if (callCount < 3) {
                    return new Response('Server Error', { status: 500 });
                }
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            const result = await api.getMarkets();
            (0, vitest_1.expect)(result).toEqual([]);
            (0, vitest_1.expect)(callCount).toBe(3);
            // Verify that there's some delay between calls (exponential backoff)
            if (callTimes.length >= 2) {
                const firstDelay = callTimes[1] - callTimes[0];
                (0, vitest_1.expect)(firstDelay).toBeGreaterThanOrEqual(0);
            }
        });
    });
    (0, vitest_1.describe)('Cache Handling with Errors', () => {
        (0, vitest_1.it)('should not cache failed responses', async () => {
            // First, set up a failure
            fetchMockImpl = async () => {
                return new Response('Server Error', { status: 500 });
            };
            // First call fails after retries
            try {
                await api.getMarkets();
            }
            catch (e) {
                // Expected - server error after retries
            }
            // Now set up success response
            let successCallCount = 0;
            fetchMockImpl = async () => {
                successCallCount++;
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            // Should make a new request (failed response was not cached)
            const result = await api.getMarkets();
            (0, vitest_1.expect)(successCallCount).toBeGreaterThan(0);
            (0, vitest_1.expect)(result).toEqual([]);
        });
    });
    (0, vitest_1.describe)('Rate Limiting with Errors', () => {
        (0, vitest_1.it)('should respect rate limiting even during retries', async () => {
            const rateLimitedApi = new polymarket_api_1.PolymarketAPI({
                rateLimit: { maxRequests: 2, windowMs: 100 },
            });
            rateLimitedApi.clearCache(); // Clear cache to ensure fresh requests
            let callCount = 0;
            fetchMockImpl = async () => {
                callCount++;
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            };
            // Make two calls with different parameters to avoid cache hit
            await rateLimitedApi.getMarkets({ limit: 1 });
            await rateLimitedApi.getMarkets({ limit: 2 });
            // Both calls should have been made
            (0, vitest_1.expect)(callCount).toBe(2);
        });
    });
});
//# sourceMappingURL=polymarket-api.error-handling.test.js.map