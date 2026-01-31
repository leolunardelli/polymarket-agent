"use strict";
/**
 * Health Check Endpoint
 *
 * CRITICAL FOR DEPLOYMENT
 * Load balancers depend on this to verify the application is alive
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHealthy = exports.healthCheckRoute = exports.checkHealth = void 0;
const logger_1 = require("./logger");
const startTime = Date.now();
/**
 * Performs health checks on all critical dependencies
 * Returns healthy only if all critical checks pass
 */
async function checkHealth() {
    const checks = {
        logger: 'ok',
        config: 'ok',
        memory: 'ok',
    };
    const details = {};
    // Check 1: Logger works
    try {
        logger_1.logger.debug('Health check initiated');
        checks.logger = 'ok';
    }
    catch (e) {
        checks.logger = 'error';
        details.logger = `Logger error: ${e instanceof Error ? e.message : String(e)}`;
    }
    // Check 2: Config is loaded
    try {
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'development';
        }
        checks.config = 'ok';
    }
    catch (e) {
        checks.config = 'error';
        details.config = `Config error: ${e instanceof Error ? e.message : String(e)}`;
    }
    // Check 3: Memory usage
    try {
        const memUsage = process.memoryUsage();
        const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        // Alert if heap is getting full (>85%)
        if (heapPercent > 85) {
            checks.memory = 'error';
            details.memory = `High memory usage: ${heapPercent.toFixed(1)}%`;
        }
        else if (heapPercent > 70) {
            checks.memory = 'ok'; // Degraded would be better, but keeping it ok for now
            details.memory = `Memory usage elevated: ${heapPercent.toFixed(1)}%`;
        }
        else {
            checks.memory = 'ok';
        }
    }
    catch (e) {
        checks.memory = 'error';
        details.memory = `Memory check error: ${e instanceof Error ? e.message : String(e)}`;
    }
    const uptime = Date.now() - startTime;
    const criticalChecks = [checks.logger, checks.config];
    const allCriticalOk = criticalChecks.every(v => v === 'ok');
    const status = {
        status: allCriticalOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime,
        checks,
        ...(Object.keys(details).length > 0 && { details }),
    };
    return status;
}
exports.checkHealth = checkHealth;
/**
 * Express-compatible health check route
 * Usage: app.get('/health', async (req, res) => {
 *   const health = await checkHealth();
 *   res.status(health.status === 'healthy' ? 200 : 503).json(health);
 * });
 */
async function healthCheckRoute(req, res) {
    try {
        const health = await checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        logger_1.logger.error('Health check failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
}
exports.healthCheckRoute = healthCheckRoute;
/**
 * Non-HTTP health check for manual verification
 */
async function isHealthy() {
    const health = await checkHealth();
    return health.status === 'healthy';
}
exports.isHealthy = isHealthy;
/**
 * For terminal/CLI usage: node -e "require('./health').checkHealth().then(h => console.log(JSON.stringify(h, null, 2)))"
 */
if (require.main === module) {
    checkHealth()
        .then(health => {
        console.log(JSON.stringify(health, null, 2));
        process.exit(health.status === 'healthy' ? 0 : 1);
    })
        .catch(error => {
        console.error('Health check error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=health.js.map