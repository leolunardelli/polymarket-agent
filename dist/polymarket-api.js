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
const MarketSchema = zod_1.z.object({
    condition_id: zod_1.z.string(),
    question: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    end_date_iso: zod_1.z.string(),
    game_start_time: zod_1.z.string().optional(),
    question_id: zod_1.z.string(),
    market_slug: zod_1.z.string(),
    min_incentive_size: zod_1.z.number().optional(),
    max_incentive_spread: zod_1.z.number().optional(),
    active: zod_1.z.boolean(),
    closed: zod_1.z.boolean(),
    archived: zod_1.z.boolean(),
    accepting_orders: zod_1.z.boolean(),
    seconds_delay: zod_1.z.number(),
    icon: zod_1.z.string().optional(),
    outcomes: zod_1.z.array(zod_1.z.object({
        price: zod_1.z.number(),
    })),
    tokens: zod_1.z.array(zod_1.z.object({
        token_id: zod_1.z.string(),
        outcome: zod_1.z.string(),
        price: zod_1.z.number(),
        winner: zod_1.z.boolean().optional(),
    })),
    volume: zod_1.z.number().optional(),
    volume_num: zod_1.z.number().optional(),
    liquidity: zod_1.z.number().optional(),
    liquidity_num: zod_1.z.number().optional(),
});
const EventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    slug: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    start_date_iso: zod_1.z.string().optional(),
    end_date_iso: zod_1.z.string().optional(),
    image: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    active: zod_1.z.boolean(),
    closed: zod_1.z.boolean(),
    archived: zod_1.z.boolean(),
    restricted: zod_1.z.boolean().optional(),
    markets: zod_1.z.array(MarketSchema),
    volume: zod_1.z.number().optional(),
    liquidity: zod_1.z.number().optional(),
});
const OrderbookSchema = zod_1.z.object({
    asset_id: zod_1.z.string(),
    bids: zod_1.z.array(zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
    })),
    asks: zod_1.z.array(zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
    })),
    timestamp: zod_1.z.number(),
});
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
        const rateLimit = config.rateLimit || { maxRequests: 100, windowMs: 60000 };
        this.maxRequests = rateLimit.maxRequests;
        this.windowMs = rateLimit.windowMs;
        this.testMode = config.testMode?.enabled || false;
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
    async fetchWithRetry(url, options = {}, schema, attempt = 1) {
        const maxAttempts = this.retryConfig.maxAttempts;
        try {
            await this.enforceRateLimit();
            const cacheKey = `${url}${JSON.stringify(options)}`;
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
            // Use AbortController for timeout support (Node.js 15+)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
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
                    return this.fetchWithRetry(url, options, schema, attempt + 1);
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
        const queryParams = new URLSearchParams({ token_id: tokenId });
        if (params.startTs)
            queryParams.set('start_ts', params.startTs.toString());
        if (params.endTs)
            queryParams.set('end_ts', params.endTs.toString());
        if (params.interval)
            queryParams.set('interval', params.interval);
        const url = `${this.urls.data}/prices?${queryParams}`;
        return this.fetch(url);
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