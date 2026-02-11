import { z } from 'zod';
import { logger } from './logger';
import { getCache, ThreadSafeCache } from './cache';
import { recordAPIMetrics } from './monitoring';

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Error tracking for monitoring
class APIError extends Error {
  constructor(
    public statusCode: number,
    public endpoint: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Coerce helper: accept both number and string, return number | undefined
const coerceNum = z.union([z.number(), z.string().transform(Number)]).optional();

// Helper: parse a JSON string that may be a stringified array, or pass through an array
const jsonStringArray = z.union([
  z.array(z.string()),
  z.string().transform((s) => {
    try { const p = JSON.parse(s); return Array.isArray(p) ? p.map(String) : []; }
    catch { return []; }
  }),
]).optional().default([]);

const MarketSchema = z.object({
  // Actual Gamma API field names (camelCase)
  conditionId: z.string().optional().default(''),
  question: z.string().optional().default(''),
  description: z.string().optional(),
  endDate: z.string().optional().default(''),
  endDateIso: z.string().optional().default(''),
  gameStartTime: z.string().optional(),
  questionID: z.string().optional().default(''),
  slug: z.string().optional().default(''),
  active: z.boolean().optional().default(false),
  closed: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  acceptingOrders: z.boolean().optional().default(false),
  secondsDelay: z.number().optional().default(0),
  icon: z.string().optional(),
  // outcomes is a JSON string like '["Yes","No"]' or an array
  outcomes: jsonStringArray,
  // outcomePrices is a JSON string like '["0.54","0.46"]' or an array
  outcomePrices: jsonStringArray,
  // clobTokenIds is a JSON string of token IDs
  clobTokenIds: jsonStringArray,
  volume: coerceNum,
  volumeNum: coerceNum,
  liquidity: coerceNum,
  liquidityNum: coerceNum,
}).passthrough();

const EventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  active: z.boolean(),
  closed: z.boolean(),
  archived: z.boolean(),
  restricted: z.boolean().optional(),
  markets: z.array(MarketSchema),
  volume: coerceNum,
  liquidity: coerceNum,
}).passthrough();

const OrderbookSchema = z.object({
  asset_id: z.string().optional().default(''),
  bids: z.array(z.object({
    price: z.string(),
    size: z.string(),
  })).optional().default([]),
  asks: z.array(z.object({
    price: z.string(),
    size: z.string(),
  })).optional().default([]),
  timestamp: z.union([z.number(), z.string().transform(Number)]).optional().default(0),
}).passthrough();

const TradeSchema = z.object({
  id: z.string(),
  market: z.string(),
  asset_id: z.string(),
  side: z.enum(['BUY', 'SELL']),
  size: z.string(),
  price: z.string(),
  timestamp: z.number(),
  fee_rate_bps: z.number().optional(),
  status: z.string().optional(),
});

const PositionSchema = z.object({
  asset_id: z.string(),
  market: z.string(),
  size: z.string(),
  average_price: z.string(),
  current_value: z.string(),
  pnl: z.string(),
  pnl_percentage: z.string(),
});

type Market = z.infer<typeof MarketSchema>;
type Event = z.infer<typeof EventSchema>;
type Orderbook = z.infer<typeof OrderbookSchema>;
type Trade = z.infer<typeof TradeSchema>;
type Position = z.infer<typeof PositionSchema>;

interface PolymarketConfig {
  apiKey?: string;
  privateKey?: string;
  chainId?: number;
  baseUrls?: {
    gamma?: string;
    clob?: string;
    data?: string;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  testMode?: {
    enabled: boolean;
    virtualBalance?: number;
  };
}

export class PolymarketAPI {
  private requests: number[] = [];
  private cache: ThreadSafeCache<string>;
  private readonly cacheTTL = 10000;
  private readonly urls: Record<string, string>;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly retryConfig: RetryConfig;
  private readonly testMode: boolean;
  private readonly defaultTimeoutMs: number;
  // P2 #8: Request deduplication — deduplicate in-flight requests
  private pendingRequests: Map<string, Promise<any>> = new Map();
  
  constructor(private config: PolymarketConfig = {}) {
    const rateLimit = config.rateLimit || { maxRequests: 100, windowMs: 60000 };
    this.maxRequests = rateLimit.maxRequests;
    this.windowMs = rateLimit.windowMs;
    this.testMode = config.testMode?.enabled || false;
    this.defaultTimeoutMs = (config as any).timeoutMs || 30000;
    
    // Use shared thread-safe cache
    this.cache = getCache(1000, this.cacheTTL);
    
    // Retry configuration with exponential backoff
    this.retryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };
    
    this.urls = {
      gamma: 'https://gamma-api.polymarket.com',
      clob: 'https://clob.polymarket.com',
      data: 'https://data-api.polymarket.com',
      ...config.baseUrls,
    };
    
    logger.info('PolymarketAPI initialized', {
      urls: this.urls,
      rateLimit,
      testMode: this.testMode,
    });
  }
  
  private async enforceRateLimit(): Promise<void> {
    while (true) {
      const now = Date.now();
      this.requests = this.requests.filter(t => now - t < this.windowMs);
      
      if (this.requests.length >= this.maxRequests) {
        // We're at the limit, wait and retry
        const wait = this.windowMs - (now - this.requests[0]);
        if (wait > 0) {
          logger.warn('Rate limit reached, waiting', { waitMs: wait });
          await new Promise(r => setTimeout(r, Math.min(wait, 1000))); // Cap wait at 1s per iteration
        }
        // Loop continues to check again
      } else {
        // We have capacity, add this request and return
        this.requests.push(now);
        return;
      }
    }
  }
  
  private isRetryableError(statusCode: number): boolean {
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // P2 #7: Normalize cache key — sort query params to avoid false misses
  private normalizeCacheKey(url: string, options: RequestInit): string {
    try {
      const u = new URL(url);
      const sorted = new URLSearchParams([...u.searchParams.entries()].sort());
      u.search = sorted.toString();
      // Exclude volatile headers (Authorization, etc.) from key
      const method = (options.method || 'GET').toUpperCase();
      return `${method}:${u.toString()}`;
    } catch {
      return `${url}_${JSON.stringify(options)}`;
    }
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    schema?: z.ZodType<T, any, any>,
    attempt: number = 1,
    timeoutMs?: number
  ): Promise<T> {
    const maxAttempts = this.retryConfig.maxAttempts;
    const cacheKey = this.normalizeCacheKey(url, options);

    // P2 #8: Deduplicate in-flight requests
    const pending = this.pendingRequests.get(cacheKey);
    if (pending && attempt === 1) {
      logger.debug('Request dedup hit', { url });
      return pending as Promise<T>;
    }

    const doFetch = async (): Promise<T> => {
    try {
      await this.enforceRateLimit();
      
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { url });
        return cached.data;
      }
      
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (options.headers && typeof options.headers === 'object') {
        Object.assign(headers, options.headers);
      }
      
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      logger.debug('Fetching', { url, attempt, maxAttempts });
      
      // P3 #2: Configurable timeout per-request
      const effectiveTimeout = timeoutMs || this.defaultTimeoutMs;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
      
      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        const body = await response.text();
        const error = new APIError(
          response.status,
          url,
          `API ${response.status}: ${body}`,
          this.isRetryableError(response.status)
        );
        
        if (error.retryable && attempt < maxAttempts) {
          const delayMs = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          logger.warn('Retryable error, backing off', { error: error.message, delayMs, attempt });
          await this.delay(delayMs);
          return this.fetchWithRetry(url, options, schema, attempt + 1, timeoutMs);
        }
        
        throw error;
      }
      
      const data = await response.json();
      
      // Validate response with schema
      let validated: T;
      try {
        validated = schema ? schema.parse(data) : (data as T);
      } catch (parseError) {
        logger.error('Response validation failed', { url, error: parseError });
        throw parseError;
      }
      
      await this.cache.set(cacheKey, validated, this.cacheTTL);
      logger.debug('Request successful', { url });
      return validated;
    } catch (error) {
      logger.error('Fetch failed', {
        url,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    }; // end doFetch

    // P2 #8: Store promise for dedup, clean up when done
    if (attempt === 1) {
      const promise = doFetch();
      this.pendingRequests.set(cacheKey, promise);
      try {
        const result = await promise;
        return result;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    }
    return doFetch();
  }
  
  private async fetch<T>(
    url: string,
    options: RequestInit = {},
    schema?: z.ZodType<T, any, any>
  ): Promise<T> {
    return this.fetchWithRetry(url, options, schema, 1);
  }
  
  async getMarkets(params: { limit?: number; offset?: number; closed?: boolean; archived?: boolean; active?: boolean; order?: 'id' | 'volume' | 'liquidity'; ascending?: boolean } = {}): Promise<Market[]> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return this.fetch(`${this.urls.gamma}/markets?${q}`, {}, z.array(MarketSchema));
  }
  
  async getMarket(slug: string): Promise<Market> {
    const url = `${this.urls.gamma}/markets/${slug}`;
    return this.fetch(url, {}, MarketSchema);
  }
  
  async getEvents(params: { limit?: number; offset?: number; closed?: boolean; archived?: boolean; order?: 'id' | 'volume' | 'liquidity'; ascending?: boolean; tag?: string } = {}): Promise<Event[]> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return this.fetch(`${this.urls.gamma}/events?${q}`, {}, z.array(EventSchema));
  }
  
  async getEvent(slug: string): Promise<Event> {
    const url = `${this.urls.gamma}/events/${slug}`;
    return this.fetch(url, {}, EventSchema);
  }
  
  async getOrderbook(tokenId: string): Promise<Orderbook> {
    const url = `${this.urls.clob}/book?token_id=${tokenId}`;
    return this.fetch(url, {}, OrderbookSchema);
  }
  
  async getPrice(tokenId: string, side: 'BUY' | 'SELL' = 'BUY'): Promise<number> {
    const url = `${this.urls.clob}/price?token_id=${tokenId}&side=${side}`;
    const data = await this.fetch<{ price: string }>(url);
    return parseFloat(data.price);
  }
  
  async getMidpoint(tokenId: string): Promise<number> {
    const url = `${this.urls.clob}/midpoint?token_id=${tokenId}`;
    const data = await this.fetch<{ mid: string }>(url);
    return parseFloat(data.mid);
  }
  
  async getSpread(tokenId: string): Promise<{ spread: number; spread_percent: number }> {
    const url = `${this.urls.clob}/spread?token_id=${tokenId}`;
    return this.fetch(url);
  }
  
  async getTrades(params: {
    market?: string;
    asset_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Trade[]> {
    const queryParams = new URLSearchParams();
    if (params.market) queryParams.set('market', params.market);
    if (params.asset_id) queryParams.set('asset_id', params.asset_id);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    
    const url = `${this.urls.data}/trades?${queryParams}`;
    return this.fetch(url, {}, z.array(TradeSchema));
  }
  
  async getPositions(address: string): Promise<Position[]> {
    const url = `${this.urls.data}/positions?user=${address}`;
    return this.fetch(url, {}, z.array(PositionSchema));
  }
  
  async searchMarkets(query: string): Promise<Market[]> {
    const url = `${this.urls.gamma}/search?q=${encodeURIComponent(query)}`;
    return this.fetch(url, {}, z.array(MarketSchema));
  }
  
  async getPriceHistory(tokenId: string, params: {
    startTs?: number;
    endTs?: number;
    interval?: 'minute' | 'hour' | 'day';
    market?: string; // conditionId — required by CLOB prices-history
  } = {}): Promise<Array<{ timestamp: number; price: number }>> {
    // CLOB prices-history requires 'market' (conditionId) not 'token_id'
    const queryParams = new URLSearchParams();
    if (params.market) queryParams.set('market', params.market);
    else queryParams.set('market', tokenId); // fallback
    if (params.startTs) queryParams.set('startTs', params.startTs.toString());
    if (params.endTs) queryParams.set('endTs', params.endTs.toString());
    if (params.interval) {
      const intervalMap: Record<string, string> = { minute: '1m', hour: '1h', day: '1d' };
      queryParams.set('interval', intervalMap[params.interval] || params.interval);
    }
    
    const url = `${this.urls.clob}/prices-history?${queryParams}`;
    try {
      const data = await this.fetch<{ history: Array<{ t: number; p: number }> }>(url);
      return (data.history || []).map(h => ({ timestamp: h.t, price: h.p }));
    } catch {
      // Fallback: use last-trade-price for a single current price
      try {
        const ltpUrl = `${this.urls.clob}/last-trade-price?token_id=${tokenId}`;
        const ltp = await this.fetch<{ price: string }>(ltpUrl);
        return [{ timestamp: Math.floor(Date.now() / 1000), price: parseFloat(ltp.price) }];
      } catch {
        return [];
      }
    }
  }
  
  async getTags(): Promise<Array<{ label: string; slug: string }>> {
    const url = `${this.urls.gamma}/tags`;
    return this.fetch(url);
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  setCacheTTL(ttl: number): void {
    (this as any).cacheTTL = ttl;
  }

  /**
   * Check if test mode is enabled
   */
  isTestMode(): boolean {
    return this.testMode;
  }

  /**
   * Get test mode configuration
   */
  getTestModeConfig(): { enabled: boolean; virtualBalance?: number } {
    return {
      enabled: this.testMode,
      virtualBalance: this.config.testMode?.virtualBalance,
    };
  }
}

export { Market, Event, Orderbook, Trade, Position, APIError };
