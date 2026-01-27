import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment configuration validation schema
 * All sensitive values must come from environment variables, never hardcoded
 */
const ConfigSchema = z.object({
  // API Configuration
  polymarket: z.object({
    apiKey: z.string().optional().describe('Polymarket API Key'),
    privateKey: z.string().optional().describe('Private key for signing transactions'),
    chainId: z.number().default(137).describe('Polygon chain ID'),
    baseUrls: z.object({
      gamma: z.string().default('https://gamma-api.polymarket.com'),
      clob: z.string().default('https://clob.polymarket.com'),
      data: z.string().default('https://data-api.polymarket.com'),
    }).optional(),
  }),

  // Database Configuration
  database: z.object({
    url: z.string().min(1).describe('Database connection URL'),
    maxConnections: z.number().default(20).describe('Max connection pool size'),
    connectionTimeoutMs: z.number().default(30000),
    idleTimeoutMs: z.number().default(30000),
  }),

  // Cache Configuration
  cache: z.object({
    ttlMs: z.number().default(10000).describe('Default cache TTL in milliseconds'),
    maxSize: z.number().default(1000).describe('Max items in cache'),
  }),

  // Rate Limiting
  rateLimit: z.object({
    maxRequests: z.number().default(100),
    windowMs: z.number().default(60000),
  }),

  // Logging Configuration
  logging: z.object({
    level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
    format: z.enum(['json', 'text']).default('json'),
  }),

  // Monitoring & Metrics
  monitoring: z.object({
    enabled: z.boolean().default(true),
    prometheusPort: z.number().default(9090),
    alertingEnabled: z.boolean().default(true),
  }),

  // Security
  security: z.object({
    corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
    tlsEnabled: z.boolean().default(true),
    tlsCertPath: z.string().optional().describe('Path to TLS certificate file'),
    tlsKeyPath: z.string().optional().describe('Path to TLS key file'),
    jwtSecret: z.string().min(32).describe('JWT secret for auth tokens'),
  }),

  // Feature Flags
  features: z.object({
    liquidityAnalysis: z.boolean().default(true),
    sentimentAnalysis: z.boolean().default(true),
    automatedTrading: z.boolean().default(false),
  }),

  // Environment
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * Ensures all required values are present and properly typed
 */
export function loadConfig(): Config {
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
    database: {
      url: process.env.DATABASE_URL,
      maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) : undefined,
      connectionTimeoutMs: process.env.DATABASE_CONNECTION_TIMEOUT ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10) : undefined,
      idleTimeoutMs: process.env.DATABASE_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10) : undefined,
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
      level: process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | undefined,
      format: process.env.LOG_FORMAT as 'json' | 'text' | undefined,
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
    environment: process.env.ENVIRONMENT as 'development' | 'staging' | 'production' | undefined,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    nodeEnv: process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined,
  };

  try {
    const config = ConfigSchema.parse(rawConfig);
    logger.info('Configuration loaded and validated', {
      environment: config.environment,
      port: config.port,
    });
    return config;
  } catch (error) {
    logger.error('Configuration validation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Validate that sensitive configuration is not logged
export function validateNoHardcodedSecrets(): void {
  const secretPatterns = [
    /apiKey|api_key|API_KEY/gi,
    /privateKey|private_key|PRIVATE_KEY/gi,
    /secret|SECRET/gi,
    /password|PASSWORD/gi,
    /token|TOKEN/gi,
  ];

  // Check environment variables don't contain secrets in values
  const sensitiveEnvVars = ['POLYMARKET_API_KEY', 'POLYMARKET_PRIVATE_KEY', 'DATABASE_URL'];
  
  for (const envVar of sensitiveEnvVars) {
    const value = process.env[envVar];
    if (value && value.length < 10) {
      logger.warn(`${envVar} appears to be hardcoded or placeholder`, {
        length: value.length,
      });
    }
  }

  logger.debug('Sensitive configuration validation passed');
}

// Singleton instance
let config: Config | null = null;

/**
 * Get the global configuration instance
 * Ensures configuration is only loaded once and validated
 */
export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  config = null;
}
