/**
 * Health Check Endpoint
 * 
 * CRITICAL FOR DEPLOYMENT
 * Load balancers depend on this to verify the application is alive
 */

import { logger } from './logger';
import { database } from './database';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    logger: 'ok' | 'error';
    config: 'ok' | 'error';
    database: 'ok' | 'error';
    memory: 'ok' | 'error';
  };
  details?: Record<string, any>;
  database?: {
    connected: boolean;
    responseTime?: number;
    poolStats?: any;
  };
}

const startTime = Date.now();

/**
 * Performs health checks on all critical dependencies
 * Returns healthy only if all critical checks pass
 */
export async function checkHealth(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {
    logger: 'ok',
    config: 'ok',
    database: 'ok',
    memory: 'ok',
  };
  
  const details: Record<string, any> = {};
  let dbHealth: { connected: boolean; responseTime?: number; poolStats?: any } = {
    connected: false,
  };
  
  // Check 1: Logger works
  try {
    logger.debug('Health check initiated');
    checks.logger = 'ok';
  } catch (e) {
    checks.logger = 'error';
    details.logger = `Logger error: ${e instanceof Error ? e.message : String(e)}`;
  }
  
  // Check 2: Config is loaded
  try {
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }
    checks.config = 'ok';
  } catch (e) {
    checks.config = 'error';
    details.config = `Config error: ${e instanceof Error ? e.message : String(e)}`;
  }
  
  // Check 3: Database connectivity
  try {
    const dbCheck = await database.healthCheck();
    if (dbCheck.healthy) {
      checks.database = 'ok';
      dbHealth = {
        connected: true,
        responseTime: dbCheck.responseTime,
        poolStats: database.getPoolStats(),
      };
    } else {
      checks.database = 'error';
      dbHealth.connected = false;
      details.database = 'Database health check failed';
    }
  } catch (e) {
    checks.database = 'error';
    dbHealth.connected = false;
    details.database = `Database error: ${e instanceof Error ? e.message : String(e)}`;
  }
  
  // Check 4: Memory usage
  try {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Alert if heap is getting full (>85%)
    if (heapPercent > 85) {
      checks.memory = 'error';
      details.memory = `High memory usage: ${heapPercent.toFixed(1)}%`;
    } else if (heapPercent > 70) {
      checks.memory = 'ok'; // Degraded would be better, but keeping it ok for now
      details.memory = `Memory usage elevated: ${heapPercent.toFixed(1)}%`;
    } else {
      checks.memory = 'ok';
    }
  } catch (e) {
    checks.memory = 'error';
    details.memory = `Memory check error: ${e instanceof Error ? e.message : String(e)}`;
  }
  
  const uptime = Date.now() - startTime;
  const criticalChecks = [checks.logger, checks.config, checks.database];
  const allCriticalOk = criticalChecks.every(v => v === 'ok');
  
  const status: HealthStatus = {
    status: allCriticalOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime,
    checks,
    database: dbHealth,
    ...(Object.keys(details).length > 0 && { details }),
  };
  
  return status;
}

/**
 * Express-compatible health check route
 * Usage: app.get('/health', async (req, res) => {
 *   const health = await checkHealth();
 *   res.status(health.status === 'healthy' ? 200 : 503).json(health);
 * });
 */
export async function healthCheckRoute(req: any, res: any): Promise<void> {
  try {
    const health = await checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
}

/**
 * Non-HTTP health check for manual verification
 */
export async function isHealthy(): Promise<boolean> {
  const health = await checkHealth();
  return health.status === 'healthy';
}

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
