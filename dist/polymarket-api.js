"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = exports.PolymarketAPI = void 0;
const zod_1 = require("zod");
const logger_1 = require("./logger");
const cache_1 = require("./cache");
// Error tracking for monitoring
class APIError extends Error {
    constructor(statusCode, endpoint, message, retryable = false) {
        super(message);
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.retryable = retryable;
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
// Coerce helper: accept both number and string, return number | undefined
const coerceNum = zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).optional();
// Helper: parse a JSON string that may be a stringified array, or pass through an array
const jsonStringArray = zod_1.z.union([
    zod_1.z.array(zod_1.z.string()),
    zod_1.z.string().transform((s) => {
        try {
            const p = JSON.parse(s);
            return Array.isArray(p) ? p.map(String) : [];
        }
        catch {
            return [];
        }
    }),
]).optional().default([]);
const MarketSchema = zod_1.z.object({
    // Actual Gamma API field names (camelCase)
    conditionId: zod_1.z.string().optional().default(''),
    question: zod_1.z.string().optional().default(''),
    description: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional().default(''),
    endDateIso: zod_1.z.string().optional().default(''),
    gameStartTime: zod_1.z.string().optional(),
    questionID: zod_1.z.string().optional().default(''),
    slug: zod_1.z.string().optional().default(''),
    active: zod_1.z.boolean().optional().default(false),
    closed: zod_1.z.boolean().optional().default(false),
    archived: zod_1.z.boolean().optional().default(false),
    acceptingOrders: zod_1.z.boolean().optional().default(false),
    secondsDelay: zod_1.z.number().optional().default(0),
    icon: zod_1.z.string().optional(),
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
const EventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    slug: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    image: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    active: zod_1.z.boolean(),
    closed: zod_1.z.boolean(),
    archived: zod_1.z.boolean(),
    restricted: zod_1.z.boolean().optional(),
    markets: zod_1.z.array(MarketSchema),
    volume: coerceNum,
    liquidity: coerceNum,
}).passthrough();
const OrderbookSchema = zod_1.z.object({
    asset_id: zod_1.z.string().optional().default(''),
    bids: zod_1.z.array(zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
    })).optional().default([]),
    asks: zod_1.z.array(zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
    })).optional().default([]),
    timestamp: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).optional().default(0),
}).passthrough();
const TradeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    market: zod_1.z.string(),
    asset_id: zod_1.z.string(),
    side: zod_1.z.enum(['BUY', 'SELL']),
    size: zod_1.z.string(),
    price: zod_1.z.string(),
    timestamp: zod_1.z.number(),
    fee_rate_bps: zod_1.z.number().optional(),
    status: zod_1.z.string().optional(),
});
const PositionSchema = zod_1.z.object({
    asset_id: zod_1.z.string(),
    market: zod_1.z.string(),
    size: zod_1.z.string(),
    average_price: zod_1.z.string(),
    current_value: zod_1.z.string(),
    pnl: zod_1.z.string(),
    pnl_percentage: zod_1.z.string(),
});
class PolymarketAPI {
    constructor(config = {}) {
        this.config = config;
        this.requests = [];
        this.cacheTTL = 10000;
        // P2 #8: Request deduplication — deduplicate in-flight requests
        this.pendingRequests = new Map();
        const rateLimit = config.rateLimit || { maxRequests: 100, windowMs: 60000 };
        this.maxRequests = rateLimit.maxRequests;
        this.windowMs = rateLimit.windowMs;
        this.testMode = config.testMode?.enabled || false;
        this.defaultTimeoutMs = config.timeoutMs || 30000;
        // Use shared thread-safe cache
        this.cache = (0, cache_1.getCache)(1000, this.cacheTTL);
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
        logger_1.logger.info('PolymarketAPI initialized', {
            urls: this.urls,
            rateLimit,
            testMode: this.testMode,
        });
    }
    async enforceRateLimit() {
        while (true) {
            const now = Date.now();
            this.requests = this.requests.filter(t => now - t < this.windowMs);
            if (this.requests.length >= this.maxRequests) {
                // We're at the limit, wait and retry
                const wait = this.windowMs - (now - this.requests[0]);
                if (wait > 0) {
                    logger_1.logger.warn('Rate limit reached, waiting', { waitMs: wait });
                    await new Promise(r => setTimeout(r, Math.min(wait, 1000))); // Cap wait at 1s per iteration
                }
                // Loop continues to check again
            }
            else {
                // We have capacity, add this request and return
                this.requests.push(now);
                return;
            }
        }
    }
    isRetryableError(statusCode) {
        // Retry on server errors and rate limiting
        return statusCode >= 500 || statusCode === 429 || statusCode === 408;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // P2 #7: Normalize cache key — sort query params to avoid false misses
    normalizeCacheKey(url, options) {
        try {
            const u = new URL(url);
            const sorted = new URLSearchParams([...u.searchParams.entries()].sort());
            u.search = sorted.toString();
            // Exclude volatile headers (Authorization, etc.) from key
            const method = (options.method || 'GET').toUpperCase();
            return `${method}:${u.toString()}`;
        }
        catch {
            return `${url}_${JSON.stringify(options)}`;
        }
    }
    async fetchWithRetry(url, options = {}, schema, attempt = 1, timeoutMs) {
        const maxAttempts = this.retryConfig.maxAttempts;
        const cacheKey = this.normalizeCacheKey(url, options);
        // P2 #8: Deduplicate in-flight requests
        const pending = this.pendingRequests.get(cacheKey);
        if (pending && attempt === 1) {
            logger_1.logger.debug('Request dedup hit', { url });
            return pending;
        }
        const doFetch = async () => {
            try {
                await this.enforceRateLimit();
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    logger_1.logger.debug('Cache hit', { url });
                    return cached.data;
                }
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (options.headers && typeof options.headers === 'object') {
                    Object.assign(headers, options.headers);
                }
                if (this.config.apiKey) {
                    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                }
                logger_1.logger.debug('Fetching', { url, attempt, maxAttempts });
                // P3 #2: Configurable timeout per-request
                const effectiveTimeout = timeoutMs || this.defaultTimeoutMs;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
                let response;
                try {
                    response = await fetch(url, {
                        ...options,
                        headers,
                        signal: controller.signal,
                    });
                }
                finally {
                    clearTimeout(timeoutId);
                }
                if (!response.ok) {
                    const body = await response.text();
                    const error = new APIError(response.status, url, `API ${response.status}: ${body}`, this.isRetryableError(response.status));
                    if (error.retryable && attempt < maxAttempts) {
                        const delayMs = Math.min(this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1), this.retryConfig.maxDelayMs);
                        logger_1.logger.warn('Retryable error, backing off', { error: error.message, delayMs, attempt });
                        await this.delay(delayMs);
                        return this.fetchWithRetry(url, options, schema, attempt + 1, timeoutMs);
                    }
                    throw error;
                }
                const data = await response.json();
                // Validate response with schema
                let validated;
                try {
                    validated = schema ? schema.parse(data) : data;
                }
                catch (parseError) {
                    logger_1.logger.error('Response validation failed', { url, error: parseError });
                    throw parseError;
                }
                await this.cache.set(cacheKey, validated, this.cacheTTL);
                logger_1.logger.debug('Request successful', { url });
                return validated;
            }
            catch (error) {
                logger_1.logger.error('Fetch failed', {
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
            }
            finally {
                this.pendingRequests.delete(cacheKey);
            }
        }
        return doFetch();
    }
    async fetch(url, options = {}, schema) {
        return this.fetchWithRetry(url, options, schema, 1);
    }
    async getMarkets(params = {}) {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
        return this.fetch(`${this.urls.gamma}/markets?${q}`, {}, zod_1.z.array(MarketSchema));
    }
    async getMarket(slug) {
        const url = `${this.urls.gamma}/markets/${slug}`;
        return this.fetch(url, {}, MarketSchema);
    }
    async getEvents(params = {}) {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
        return this.fetch(`${this.urls.gamma}/events?${q}`, {}, zod_1.z.array(EventSchema));
    }
    async getEvent(slug) {
        const url = `${this.urls.gamma}/events/${slug}`;
        return this.fetch(url, {}, EventSchema);
    }
    async getOrderbook(tokenId) {
        const url = `${this.urls.clob}/book?token_id=${tokenId}`;
        return this.fetch(url, {}, OrderbookSchema);
    }
    async getPrice(tokenId, side = 'BUY') {
        const url = `${this.urls.clob}/price?token_id=${tokenId}&side=${side}`;
        const data = await this.fetch(url);
        return parseFloat(data.price);
    }
    async getMidpoint(tokenId) {
        const url = `${this.urls.clob}/midpoint?token_id=${tokenId}`;
        const data = await this.fetch(url);
        return parseFloat(data.mid);
    }
    async getSpread(tokenId) {
        const url = `${this.urls.clob}/spread?token_id=${tokenId}`;
        return this.fetch(url);
    }
    async getTrades(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.market)
            queryParams.set('market', params.market);
        if (params.asset_id)
            queryParams.set('asset_id', params.asset_id);
        if (params.limit)
            queryParams.set('limit', params.limit.toString());
        if (params.offset)
            queryParams.set('offset', params.offset.toString());
        const url = `${this.urls.data}/trades?${queryParams}`;
        return this.fetch(url, {}, zod_1.z.array(TradeSchema));
    }
    async getPositions(address) {
        const url = `${this.urls.data}/positions?user=${address}`;
        return this.fetch(url, {}, zod_1.z.array(PositionSchema));
    }
    async searchMarkets(query) {
        const url = `${this.urls.gamma}/search?q=${encodeURIComponent(query)}`;
        return this.fetch(url, {}, zod_1.z.array(MarketSchema));
    }
    async getPriceHistory(tokenId, params = {}) {
        // CLOB prices-history requires 'market' (conditionId) not 'token_id'
        const queryParams = new URLSearchParams();
        if (params.market)
            queryParams.set('market', params.market);
        else
            queryParams.set('market', tokenId); // fallback
        if (params.startTs)
            queryParams.set('startTs', params.startTs.toString());
        if (params.endTs)
            queryParams.set('endTs', params.endTs.toString());
        if (params.interval) {
            const intervalMap = { minute: '1m', hour: '1h', day: '1d' };
            queryParams.set('interval', intervalMap[params.interval] || params.interval);
        }
        const url = `${this.urls.clob}/prices-history?${queryParams}`;
        try {
            const data = await this.fetch(url);
            return (data.history || []).map(h => ({ timestamp: h.t, price: h.p }));
        }
        catch {
            // Fallback: use last-trade-price for a single current price
            try {
                const ltpUrl = `${this.urls.clob}/last-trade-price?token_id=${tokenId}`;
                const ltp = await this.fetch(ltpUrl);
                return [{ timestamp: Math.floor(Date.now() / 1000), price: parseFloat(ltp.price) }];
            }
            catch {
                return [];
            }
        }
    }
    async getTags() {
        const url = `${this.urls.gamma}/tags`;
        return this.fetch(url);
    }
    clearCache() {
        this.cache.clear();
    }
    setCacheTTL(ttl) {
        this.cacheTTL = ttl;
    }
    /**
     * Check if test mode is enabled
     */
    isTestMode() {
        return this.testMode;
    }
    /**
     * Get test mode configuration
     */
    getTestModeConfig() {
        return {
            enabled: this.testMode,
            virtualBalance: this.config.testMode?.virtualBalance,
        };
    }
}
exports.PolymarketAPI = PolymarketAPI;
//# sourceMappingURL=polymarket-api.js.map