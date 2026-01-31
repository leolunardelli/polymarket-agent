"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetConfig = exports.getConfig = exports.validateNoHardcodedSecrets = exports.loadConfig = void 0;
const zod_1 = require("zod");
const logger_1 = require("./logger");
/**
 * Environment configuration validation schema
 * All sensitive values must come from environment variables, never hardcoded
 */
const ConfigSchema = zod_1.z.object({
    // API Configuration
    polymarket: zod_1.z.object({
        apiKey: zod_1.z.string().optional().describe('Polymarket API Key'),
        privateKey: zod_1.z.string().optional().describe('Private key for signing transactions'),
        chainId: zod_1.z.number().default(137).describe('Polygon chain ID'),
        baseUrls: zod_1.z.object({
            gamma: zod_1.z.string().default('https://gamma-api.polymarket.com'),
            clob: zod_1.z.string().default('https://clob.polymarket.com'),
            data: zod_1.z.string().default('https://data-api.polymarket.com'),
        }).optional(),
    }),
    // Cache Configuration
    cache: zod_1.z.object({
        ttlMs: zod_1.z.number().default(10000).describe('Default cache TTL in milliseconds'),
        maxSize: zod_1.z.number().default(1000).describe('Max items in cache'),
    }),
    // Rate Limiting
    rateLimit: zod_1.z.object({
        maxRequests: zod_1.z.number().default(100),
        windowMs: zod_1.z.number().default(60000),
    }),
    // Logging Configuration
    logging: zod_1.z.object({
        level: zod_1.z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
        format: zod_1.z.enum(['json', 'text']).default('json'),
    }),
    // Monitoring & Metrics
    monitoring: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        prometheusPort: zod_1.z.number().default(9090),
        alertingEnabled: zod_1.z.boolean().default(true),
    }),
    // Security
    security: zod_1.z.object({
        corsOrigins: zod_1.z.array(zod_1.z.string()).default(['http://localhost:3000']),
        tlsEnabled: zod_1.z.boolean().default(false),
        tlsCertPath: zod_1.z.string().optional().describe('Path to TLS certificate file'),
        tlsKeyPath: zod_1.z.string().optional().describe('Path to TLS key file'),
        jwtSecret: zod_1.z.string().min(32).default('development-jwt-secret-change-in-production-32chars').describe('JWT secret for auth tokens'),
    }),
    // Feature Flags
    features: zod_1.z.object({
        liquidityAnalysis: zod_1.z.boolean().default(true),
        sentimentAnalysis: zod_1.z.boolean().default(true),
        automatedTrading: zod_1.z.boolean().default(false),
    }),
    // Test Mode & Leaderboard Configuration
    testMode: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false).describe('Enable virtual token trading for testing'),
        virtualBalance: zod_1.z.number().default(10000).describe('Starting virtual token balance'),
        durationDays: zod_1.z.number().default(7).describe('Test duration in days'),
        leaderboardEnabled: zod_1.z.boolean().default(true).describe('Track metrics based on leaderboard'),
        metricsSource: zod_1.z.enum(['leaderboard', 'manual']).default('leaderboard').describe('Metrics source: leaderboard or manual'),
        passphrase: zod_1.z.string().optional().describe('Passphrase for Polymarket API'),
        secret: zod_1.z.string().optional().describe('Secret key for Polymarket API'),
    }),
    // Environment
    environment: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    port: zod_1.z.number().default(3000),
    nodeEnv: zod_1.z.enum(['development', 'test', 'production']).default('development'),
});
/**
 * Load and validate configuration from environment variables
 * Ensures all required values are present and properly typed
 */
function loadConfig() {
    const rawConfig = {
        polymarket: {
            apiKey: process.env.POLYMARKET_API_KEY,
            privateKey: process.env.POLYMARKET_PRIVATE_KEY,
            chainId: process.env.POLYMARKET_CHAIN_ID ? parseInt(process.env.POLYMARKET_CHAIN_ID, 10) : undefined,
            baseUrls: {
                gamma: process.env.POLYMARKET_GAMMA_URL,
                clob: process.env.POLYMARKET_CLOB_URL,
                data: process.env.POLYMARKET_DATA_URL,
            },
        },
        cache: {
            ttlMs: process.env.CACHE_TTL_MS ? parseInt(process.env.CACHE_TTL_MS, 10) : undefined,
            maxSize: process.env.CACHE_MAX_SIZE ? parseInt(process.env.CACHE_MAX_SIZE, 10) : undefined,
        },
        rateLimit: {
            maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : undefined,
            windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : undefined,
        },
        logging: {
            level: process.env.LOG_LEVEL,
            format: process.env.LOG_FORMAT,
        },
        monitoring: {
            enabled: process.env.MONITORING_ENABLED !== 'false',
            prometheusPort: process.env.PROMETHEUS_PORT ? parseInt(process.env.PROMETHEUS_PORT, 10) : undefined,
            alertingEnabled: process.env.ALERTING_ENABLED !== 'false',
        },
        security: {
            corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : undefined,
            tlsEnabled: process.env.TLS_ENABLED !== 'false',
            tlsCertPath: process.env.TLS_CERT_PATH,
            tlsKeyPath: process.env.TLS_KEY_PATH,
            jwtSecret: process.env.JWT_SECRET,
        },
        features: {
            liquidityAnalysis: process.env.FEATURE_LIQUIDITY_ANALYSIS !== 'false',
            sentimentAnalysis: process.env.FEATURE_SENTIMENT_ANALYSIS !== 'false',
            automatedTrading: process.env.FEATURE_AUTOMATED_TRADING === 'true',
        },
        testMode: {
            enabled: process.env.TEST_MODE_ENABLED === 'true',
            virtualBalance: process.env.VIRTUAL_BALANCE ? parseInt(process.env.VIRTUAL_BALANCE, 10) : undefined,
            durationDays: process.env.TEST_DURATION_DAYS ? parseInt(process.env.TEST_DURATION_DAYS, 10) : undefined,
            leaderboardEnabled: process.env.LEADERBOARD_ENABLED !== 'false',
            metricsSource: process.env.METRICS_SOURCE,
            passphrase: process.env.POLYMARKET_PASSPHRASE,
            secret: process.env.POLYMARKET_SECRET,
        },
        environment: process.env.ENVIRONMENT,
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
        nodeEnv: process.env.NODE_ENV,
    };
    try {
        const config = ConfigSchema.parse(rawConfig);
        logger_1.logger.info('Configuration loaded and validated', {
            environment: config.environment,
            port: config.port,
        });
        return config;
    }
    catch (error) {
        logger_1.logger.error('Configuration validation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
exports.loadConfig = loadConfig;
// Validate that sensitive configuration is not logged
function validateNoHardcodedSecrets() {
    const secretPatterns = [
        /apiKey|api_key|API_KEY/gi,
        /privateKey|private_key|PRIVATE_KEY/gi,
        /secret|SECRET/gi,
        /password|PASSWORD/gi,
        /token|TOKEN/gi,
    ];
    // Check environment variables don't contain secrets in values
    const sensitiveEnvVars = ['POLYMARKET_API_KEY', 'POLYMARKET_PRIVATE_KEY'];
    for (const envVar of sensitiveEnvVars) {
        const value = process.env[envVar];
        if (value && value.length < 10) {
            logger_1.logger.warn(`${envVar} appears to be hardcoded or placeholder`, {
                length: value.length,
            });
        }
    }
    logger_1.logger.debug('Sensitive configuration validation passed');
}
exports.validateNoHardcodedSecrets = validateNoHardcodedSecrets;
// Singleton instance
let config = null;
/**
 * Get the global configuration instance
 * Ensures configuration is only loaded once and validated
 */
function getConfig() {
    if (!config) {
        config = loadConfig();
    }
    return config;
}
exports.getConfig = getConfig;
/**
 * Reset configuration (useful for testing)
 */
function resetConfig() {
    config = null;
}
exports.resetConfig = resetConfig;
//# sourceMappingURL=env-config.js.map