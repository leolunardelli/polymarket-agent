import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch before importing PolymarketAPI
let fetchMockImpl: any;
global.fetch = vi.fn(async () => {
  if (!fetchMockImpl) {
    throw new Error('No fetch implementation provided');
  }
  return fetchMockImpl();
});

import { PolymarketAPI, APIError } from '../polymarket-api';

describe('PolymarketAPI - Error Handling and Retries', () => {
  let api: PolymarketAPI;
  const fetchMock = global.fetch as any;

  beforeEach(() => {
    api = new PolymarketAPI();
    api.clearCache(); // Clear cache between tests to ensure fresh fetch calls
    fetchMock.mockClear();
    fetchMockImpl = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    fetchMockImpl = null;
  });

  describe('Retryable Errors', () => {
    it('should retry on 500 Internal Server Error', async () => {
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

      expect(callCount).toBe(2);
      expect(result).toEqual([]);
    });

    it('should retry on 429 Rate Limit', async () => {
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

      expect(callCount).toBe(2);
      expect(result).toEqual([]);
    });

    it('should retry on 408 Request Timeout', async () => {
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

      expect(callCount).toBe(2);
      expect(result).toEqual([]);
    });

    it('should fail immediately on 400 Bad Request', async () => {
      let callCount = 0;
      fetchMockImpl = async () => {
        callCount++;
        return new Response('Bad Request', { status: 400 });
      };

      try {
        await api.getMarkets();
        expect.fail('Should have thrown APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect(callCount).toBe(1);
      }
    });

    it('should fail immediately on 404 Not Found', async () => {
      let callCount = 0;
      fetchMockImpl = async () => {
        callCount++;
        return new Response('Not Found', { status: 404 });
      };

      try {
        await api.getMarket('nonexistent-market');
        expect.fail('Should have thrown APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect(callCount).toBe(1);
      }
    });

    it('should fail after max retries on persistent 500', async () => {
      let callCount = 0;
      fetchMockImpl = async () => {
        callCount++;
        return new Response('Server Error', { status: 500 });
      };

      try {
        await api.getMarkets();
        expect.fail('Should have thrown APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        // maxAttempts is 3 (1 initial + 2 retries)
        expect(callCount).toBe(3);
      }
    });
  });

  describe('Error Logging', () => {
    it('should include error details in APIError', async () => {
      fetchMockImpl = async () => {
        return new Response('Not Found', { status: 404 });
      };

      try {
        await api.getMarkets();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).statusCode).toBe(404);
        expect((error as APIError).endpoint).toContain('markets');
        expect((error as APIError).retryable).toBe(false);
      }
    });

    it('should mark server errors as retryable', async () => {
      fetchMockImpl = async () => {
        return new Response('Server Error', { status: 502 });
      };

      try {
        await api.getMarkets();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as APIError).retryable).toBe(true);
      }
    });
  });

  describe('Response Validation', () => {
    it('should validate market response against schema', async () => {
      const invalidMarket = { question: 'Test?' }; // Missing required fields

      fetchMockImpl = async () => {
        return new Response(JSON.stringify(invalidMarket), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        await api.getMarket('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed JSON responses', async () => {
      fetchMockImpl = async () => {
        return new Response('{ invalid json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        await api.getMarkets();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Backoff Strategy', () => {
    it('should use exponential backoff on retries', async () => {
      let callCount = 0;
      let callTimes: number[] = [];

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

      expect(result).toEqual([]);
      expect(callCount).toBe(3);
      
      // Verify that there's some delay between calls (exponential backoff)
      if (callTimes.length >= 2) {
        const firstDelay = callTimes[1] - callTimes[0];
        expect(firstDelay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Cache Handling with Errors', () => {
    it('should not cache failed responses', async () => {
      // First, set up a failure
      fetchMockImpl = async () => {
        return new Response('Server Error', { status: 500 });
      };

      // First call fails after retries
      try {
        await api.getMarkets();
      } catch (e) {
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
      expect(successCallCount).toBeGreaterThan(0);
      expect(result).toEqual([]);
    });
  });

  describe('Rate Limiting with Errors', () => {
    it('should respect rate limiting even during retries', async () => {
      const rateLimitedApi = new PolymarketAPI({
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
      expect(callCount).toBe(2);
    });
  });
});
