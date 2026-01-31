import { z } from 'zod';
/**
 * Environment configuration validation schema
 * All sensitive values must come from environment variables, never hardcoded
 */
declare const ConfigSchema: z.ZodObject<{
    polymarket: z.ZodObject<{
        apiKey: z.ZodOptional<z.ZodString>;
        privateKey: z.ZodOptional<z.ZodString>;
        chainId: z.ZodDefault<z.ZodNumber>;
        baseUrls: z.ZodOptional<z.ZodObject<{
            gamma: z.ZodDefault<z.ZodString>;
            clob: z.ZodDefault<z.ZodString>;
            data: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            data: string;
            gamma: string;
            clob: string;
        }, {
            gamma?: string | undefined;
            clob?: string | undefined;
            data?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        chainId: number;
        apiKey?: string | undefined;
        privateKey?: string | undefined;
        baseUrls?: {
            data: string;
            gamma: string;
            clob: string;
        } | undefined;
    }, {
        apiKey?: string | undefined;
        privateKey?: string | undefined;
        chainId?: number | undefined;
        baseUrls?: {
            gamma?: string | undefined;
            clob?: string | undefined;
            data?: string | undefined;
        } | undefined;
    }>;
    cache: z.ZodObject<{
        ttlMs: z.ZodDefault<z.ZodNumber>;
        maxSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        ttlMs: number;
        maxSize: number;
    }, {
        ttlMs?: number | undefined;
        maxSize?: number | undefined;
    }>;
    rateLimit: z.ZodObject<{
        maxRequests: z.ZodDefault<z.ZodNumber>;
        windowMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxRequests: number;
        windowMs: number;
    }, {
        maxRequests?: number | undefined;
        windowMs?: number | undefined;
    }>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["DEBUG", "INFO", "WARN", "ERROR"]>>;
        format: z.ZodDefault<z.ZodEnum<["json", "text"]>>;
    }, "strip", z.ZodTypeAny, {
        level: "DEBUG" | "INFO" | "WARN" | "ERROR";
        format: "json" | "text";
    }, {
        level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | undefined;
        format?: "json" | "text" | undefined;
    }>;
    monitoring: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        prometheusPort: z.ZodDefault<z.ZodNumber>;
        alertingEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        prometheusPort: number;
        alertingEnabled: boolean;
    }, {
        enabled?: boolean | undefined;
        prometheusPort?: number | undefined;
        alertingEnabled?: boolean | undefined;
    }>;
    security: z.ZodObject<{
        corsOrigins: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tlsEnabled: z.ZodDefault<z.ZodBoolean>;
        tlsCertPath: z.ZodOptional<z.ZodString>;
        tlsKeyPath: z.ZodOptional<z.ZodString>;
        jwtSecret: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        corsOrigins: string[];
        tlsEnabled: boolean;
        jwtSecret: string;
        tlsCertPath?: string | undefined;
        tlsKeyPath?: string | undefined;
    }, {
        corsOrigins?: string[] | undefined;
        tlsEnabled?: boolean | undefined;
        tlsCertPath?: string | undefined;
        tlsKeyPath?: string | undefined;
        jwtSecret?: string | undefined;
    }>;
    features: z.ZodObject<{
        liquidityAnalysis: z.ZodDefault<z.ZodBoolean>;
        sentimentAnalysis: z.ZodDefault<z.ZodBoolean>;
        automatedTrading: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        liquidityAnalysis: boolean;
        sentimentAnalysis: boolean;
        automatedTrading: boolean;
    }, {
        liquidityAnalysis?: boolean | undefined;
        sentimentAnalysis?: boolean | undefined;
        automatedTrading?: boolean | undefined;
    }>;
    testMode: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        virtualBalance: z.ZodDefault<z.ZodNumber>;
        durationDays: z.ZodDefault<z.ZodNumber>;
        leaderboardEnabled: z.ZodDefault<z.ZodBoolean>;
        metricsSource: z.ZodDefault<z.ZodEnum<["leaderboard", "manual"]>>;
        passphrase: z.ZodOptional<z.ZodString>;
        secret: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        virtualBalance: number;
        durationDays: number;
        leaderboardEnabled: boolean;
        metricsSource: "leaderboard" | "manual";
        passphrase?: string | undefined;
        secret?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        virtualBalance?: number | undefined;
        durationDays?: number | undefined;
        leaderboardEnabled?: boolean | undefined;
        metricsSource?: "leaderboard" | "manual" | undefined;
        passphrase?: string | undefined;
        secret?: string | undefined;
    }>;
    environment: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
}, "strip", z.ZodTypeAny, {
    port: number;
    polymarket: {
        chainId: number;
        apiKey?: string | undefined;
        privateKey?: string | undefined;
        baseUrls?: {
            data: string;
            gamma: string;
            clob: string;
        } | undefined;
    };
    cache: {
        ttlMs: number;
        maxSize: number;
    };
    rateLimit: {
        maxRequests: number;
        windowMs: number;
    };
    logging: {
        level: "DEBUG" | "INFO" | "WARN" | "ERROR";
        format: "json" | "text";
    };
    monitoring: {
        enabled: boolean;
        prometheusPort: number;
        alertingEnabled: boolean;
    };
    security: {
        corsOrigins: string[];
        tlsEnabled: boolean;
        jwtSecret: string;
        tlsCertPath?: string | undefined;
        tlsKeyPath?: string | undefined;
    };
    features: {
        liquidityAnalysis: boolean;
        sentimentAnalysis: boolean;
        automatedTrading: boolean;
    };
    testMode: {
        enabled: boolean;
        virtualBalance: number;
        durationDays: number;
        leaderboardEnabled: boolean;
        metricsSource: "leaderboard" | "manual";
        passphrase?: string | undefined;
        secret?: string | undefined;
    };
    environment: "development" | "staging" | "production";
    nodeEnv: "development" | "production" | "test";
}, {
    polymarket: {
        apiKey?: string | undefined;
        privateKey?: string | undefined;
        chainId?: number | undefined;
        baseUrls?: {
            gamma?: string | undefined;
            clob?: string | undefined;
            data?: string | undefined;
        } | undefined;
    };
    cache: {
        ttlMs?: number | undefined;
        maxSize?: number | undefined;
    };
    rateLimit: {
        maxRequests?: number | undefined;
        windowMs?: number | undefined;
    };
    logging: {
        level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | undefined;
        format?: "json" | "text" | undefined;
    };
    monitoring: {
        enabled?: boolean | undefined;
        prometheusPort?: number | undefined;
        alertingEnabled?: boolean | undefined;
    };
    security: {
        corsOrigins?: string[] | undefined;
        tlsEnabled?: boolean | undefined;
        tlsCertPath?: string | undefined;
        tlsKeyPath?: string | undefined;
        jwtSecret?: string | undefined;
    };
    features: {
        liquidityAnalysis?: boolean | undefined;
        sentimentAnalysis?: boolean | undefined;
        automatedTrading?: boolean | undefined;
    };
    testMode: {
        enabled?: boolean | undefined;
        virtualBalance?: number | undefined;
        durationDays?: number | undefined;
        leaderboardEnabled?: boolean | undefined;
        metricsSource?: "leaderboard" | "manual" | undefined;
        passphrase?: string | undefined;
        secret?: string | undefined;
    };
    environment?: "development" | "staging" | "production" | undefined;
    port?: number | undefined;
    nodeEnv?: "development" | "production" | "test" | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Load and validate configuration from environment variables
 * Ensures all required values are present and properly typed
 */
export declare function loadConfig(): Config;
export declare function validateNoHardcodedSecrets(): void;
/**
 * Get the global configuration instance
 * Ensures configuration is only loaded once and validated
 */
export declare function getConfig(): Config;
/**
 * Reset configuration (useful for testing)
 */
export declare function resetConfig(): void;
export {};
//# sourceMappingURL=env-config.d.ts.map