/**
 * Health Check Endpoint
 *
 * CRITICAL FOR DEPLOYMENT
 * Load balancers depend on this to verify the application is alive
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
        logger: 'ok' | 'error';
        config: 'ok' | 'error';
        memory: 'ok' | 'error';
    };
    details?: Record<string, any>;
    database?: {
        connected: boolean;
        responseTime?: number;
        poolStats?: any;
    };
}
/**
 * Performs health checks on all critical dependencies
 * Returns healthy only if all critical checks pass
 */
export declare function checkHealth(): Promise<HealthStatus>;
/**
 * Express-compatible health check route
 * Usage: app.get('/health', async (req, res) => {
 *   const health = await checkHealth();
 *   res.status(health.status === 'healthy' ? 200 : 503).json(health);
 * });
 */
export declare function healthCheckRoute(req: any, res: any): Promise<void>;
/**
 * Non-HTTP health check for manual verification
 */
export declare function isHealthy(): Promise<boolean>;
//# sourceMappingURL=health.d.ts.map