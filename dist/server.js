"use strict";
/**
 * Main Application Server
 * Complete production-grade Express server with all middleware, error handling, and integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServer = void 0;
const express_1 = __importDefault(require("express"));
const logger_1 = require("./logger");
const health_1 = require("./health");
const graceful_shutdown_1 = require("./graceful-shutdown");
const env_config_1 = require("./env-config");
const polymarket_api_1 = require("./polymarket-api");
class ApplicationServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.config = (0, env_config_1.getConfig)();
        this.apiClient = new polymarket_api_1.PolymarketAPI({
            apiKey: this.config.polymarket.apiKey,
            privateKey: this.config.polymarket.privateKey,
            baseUrls: this.config.polymarket.baseUrls,
            rateLimit: this.config.rateLimit,
        });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    /**
     * Setup all middleware in order
     */
    setupMiddleware() {
        // 1. Request ID injection - MUST BE FIRST
        this.app.use((req, res, next) => {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            req.requestId = requestId;
            req.startTime = Date.now();
            // Set request ID in response headers for tracing
            res.setHeader('X-Request-ID', requestId);
            // Set in logger context
            logger_1.logger.setRequestId(requestId);
            logger_1.logger.debug('Request started', {
                method: req.method,
                path: req.path,
                ip: req.ip,
            });
            next();
        });
        // 2. Shutdown check - reject new requests if shutting down
        this.app.use((req, res, next) => {
            if ((0, graceful_shutdown_1.isShutdownInProgress)()) {
                logger_1.logger.warn('Request rejected - server shutting down', {
                    method: req.method,
                    path: req.path,
                });
                return res.status(503).json({
                    error: 'Server is shutting down',
                    requestId: req.requestId,
                });
            }
            next();
        });
        // 3. Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
        // 4. CORS
        this.app.use((req, res, next) => {
            const allowedOrigins = this.config.security.corsOrigins || ['*'];
            const origin = req.get('origin');
            if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin || '*');
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });
        // 5. Request timeout (30 seconds for API calls)
        this.app.use((req, res, next) => {
            const timeout = setTimeout(() => {
                if (!res.headersSent) {
                    logger_1.logger.error('Request timeout', {
                        method: req.method,
                        path: req.path,
                        duration: Date.now() - req.startTime,
                    });
                    res.status(408).json({
                        error: 'Request timeout',
                        requestId: req.requestId,
                    });
                }
            }, 30000); // 30 seconds
            res.on('finish', () => clearTimeout(timeout));
            next();
        });
        // 6. Request logging
        this.app.use((req, res, next) => {
            const originalSend = res.send;
            res.send = function (data) {
                const duration = Date.now() - req.startTime;
                const statusCode = res.statusCode;
                logger_1.logger.info('Request completed', {
                    method: req.method,
                    path: req.path,
                    statusCode,
                    duration,
                    requestId: req.requestId,
                });
                res.send = originalSend;
                return res.send(data);
            };
            next();
        });
    }
    /**
     * Setup all routes
     */
    setupRoutes() {
        // Health check - CRITICAL for deployment
        this.app.get('/health', async (req, res) => {
            try {
                await (0, health_1.healthCheckRoute)(req, res);
            }
            catch (error) {
                logger_1.logger.error('Health check failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
            }
        });
        // Metrics - Prometheus format
        this.app.get('/metrics', (req, res) => {
            try {
                const metrics = this.getPrometheusMetrics();
                res.set('Content-Type', 'text/plain; charset=utf-8');
                res.send(metrics);
            }
            catch (error) {
                logger_1.logger.error('Metrics endpoint failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({ error: 'Failed to generate metrics' });
            }
        });
        // Version
        this.app.get('/version', (req, res) => {
            res.json({
                version: '1.0.0',
                environment: this.config.environment,
                timestamp: new Date().toISOString(),
            });
        });
        // API Routes - Markets
        this.app.get('/api/markets', async (req, res, next) => {
            try {
                const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
                const offset = parseInt(req.query.offset) || 0;
                logger_1.logger.debug('Fetching markets', { limit, offset });
                const markets = await this.apiClient.getMarkets({
                    limit,
                    offset,
                    closed: req.query.closed === 'true',
                    archived: req.query.archived === 'false' ? false : undefined,
                });
                res.json({
                    data: markets,
                    count: markets.length,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Market Detail
        this.app.get('/api/markets/:slug', async (req, res, next) => {
            try {
                const { slug } = req.params;
                logger_1.logger.debug('Fetching market', { slug });
                const market = await this.apiClient.getMarket(slug);
                res.json({
                    data: market,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Events
        this.app.get('/api/events', async (req, res, next) => {
            try {
                const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
                const offset = parseInt(req.query.offset) || 0;
                logger_1.logger.debug('Fetching events', { limit, offset });
                const events = await this.apiClient.getEvents({
                    limit,
                    offset,
                    closed: req.query.closed === 'true',
                    archived: req.query.archived === 'false' ? false : undefined,
                });
                res.json({
                    data: events,
                    count: events.length,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Event Detail
        this.app.get('/api/events/:slug', async (req, res, next) => {
            try {
                const { slug } = req.params;
                logger_1.logger.debug('Fetching event', { slug });
                const event = await this.apiClient.getEvent(slug);
                res.json({
                    data: event,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Orderbook
        this.app.get('/api/orderbook/:tokenId', async (req, res, next) => {
            try {
                const { tokenId } = req.params;
                logger_1.logger.debug('Fetching orderbook', { tokenId });
                const orderbook = await this.apiClient.getOrderbook(tokenId);
                res.json({
                    data: orderbook,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Price
        this.app.get('/api/price/:tokenId', async (req, res, next) => {
            try {
                const { tokenId } = req.params;
                const side = req.query.side || 'BUY';
                logger_1.logger.debug('Fetching price', { tokenId, side });
                const price = await this.apiClient.getPrice(tokenId, side);
                res.json({
                    price,
                    tokenId,
                    side,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // API Routes - Search
        this.app.get('/api/search', async (req, res, next) => {
            try {
                const query = req.query.q;
                if (!query || query.length < 2) {
                    return res.status(400).json({
                        error: 'Search query must be at least 2 characters',
                        requestId: req.requestId,
                    });
                }
                logger_1.logger.debug('Searching markets', { query });
                const results = await this.apiClient.searchMarkets(query);
                res.json({
                    data: results,
                    count: results.length,
                    query,
                    requestId: req.requestId,
                });
            }
            catch (error) {
                next(error);
            }
        });
        // 404 handler
        this.app.use((req, res) => {
            logger_1.logger.warn('Route not found', {
                method: req.method,
                path: req.path,
            });
            res.status(404).json({
                error: 'Route not found',
                path: req.path,
                method: req.method,
                requestId: req.requestId,
            });
        });
    }
    /**
     * Setup centralized error handling
     */
    setupErrorHandling() {
        const errorHandler = (error, req, res, next) => {
            const duration = Date.now() - req.startTime;
            const statusCode = error.statusCode || 500;
            const isRetryable = error.retryable || false;
            logger_1.logger.error('Request error', {
                error: error.message,
                stack: error.stack,
                method: req.method,
                path: req.path,
                statusCode,
                duration,
                retryable: isRetryable,
            });
            res.status(statusCode).json({
                error: error.message || 'Internal server error',
                statusCode,
                requestId: req.requestId,
                retryable: isRetryable,
                timestamp: new Date().toISOString(),
            });
        };
        this.app.use(errorHandler);
    }
    /**
     * Generate Prometheus metrics in text format
     */
    getPrometheusMetrics() {
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const metrics = [
            '# HELP application_uptime_seconds Application uptime in seconds',
            '# TYPE application_uptime_seconds gauge',
            `application_uptime_seconds ${uptime}`,
            '',
            '# HELP process_resident_memory_bytes Resident memory usage in bytes',
            '# TYPE process_resident_memory_bytes gauge',
            `process_resident_memory_bytes ${memory.rss}`,
            '',
            '# HELP process_heap_used_bytes Heap memory used in bytes',
            '# TYPE process_heap_used_bytes gauge',
            `process_heap_used_bytes ${memory.heapUsed}`,
            '',
            '# HELP process_heap_total_bytes Total heap memory in bytes',
            '# TYPE process_heap_total_bytes gauge',
            `process_heap_total_bytes ${memory.heapTotal}`,
            '',
            '# HELP nodejs_version_info Node.js version information',
            '# TYPE nodejs_version_info gauge',
            `nodejs_version_info{version="${process.version}"} 1`,
        ];
        return metrics.join('\n') + '\n';
    }
    /**
     * Start the server
     */
    async start() {
        const port = this.config.port || 3000;
        return new Promise((resolve, reject) => {
            try {
                // Setup graceful shutdown handlers
                (0, graceful_shutdown_1.setupGracefulShutdown)();
                const server = this.app.listen(port, () => {
                    logger_1.logger.info('Server started successfully', {
                        port,
                        environment: this.config.environment,
                        nodeVersion: process.version,
                    });
                    resolve();
                });
                server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger_1.logger.error('Port already in use', { port });
                    }
                    else {
                        logger_1.logger.error('Server error', {
                            error: error.message,
                            code: error.code,
                        });
                    }
                    reject(error);
                });
                // Store server for graceful shutdown
                global.appServer = server;
            }
            catch (error) {
                logger_1.logger.error('Failed to start server', {
                    error: error instanceof Error ? error.message : String(error),
                });
                reject(error);
            }
        });
    }
    /**
     * Get Express app for testing
     */
    getApp() {
        return this.app;
    }
}
// Export singleton for use in main
let serverInstance = null;
function getServer() {
    if (!serverInstance) {
        serverInstance = new ApplicationServer();
    }
    return serverInstance;
}
exports.getServer = getServer;
/**
 * If run directly, start the server
 */
if (require.main === module) {
    getServer()
        .start()
        .catch((error) => {
        logger_1.logger.error('Failed to start application', {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    });
}
exports.default = ApplicationServer;
//# sourceMappingURL=server.js.map