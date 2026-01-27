/**
 * Database Module - PostgreSQL Connection Management
 * Provides connection pooling, query execution, and transaction support
 */

import { Pool, Client, QueryResult, PoolConfig } from 'pg';
import { logger } from './logger';
import { getConfig } from './env-config';

interface DatabaseConfig extends PoolConfig {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

interface QueryOptions {
  timeout?: number;
  retries?: number;
}

class Database {
  private static instance: Database;
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private activeConnections: number = 0;

  private constructor(private config: DatabaseConfig) {}

  /**
   * Get or create singleton instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      const config = getConfig();
      const dbUrl = new URL(config.database.url);
      
      Database.instance = new Database({
        host: dbUrl.hostname || 'localhost',
        port: parseInt(dbUrl.port) || 5432,
        database: dbUrl.pathname.replace('/', '') || 'polymarket',
        user: dbUrl.username || 'postgres',
        password: dbUrl.password || '',
        max: 20, // Maximum connections in pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statement_timeout: 30000,
      });
    }
    return Database.instance;
  }

  /**
   * Connect to database with retry logic
   */
  public async connect(maxRetries: number = 3): Promise<void> {
    if (this.isConnected && this.pool) {
      logger.debug('Database already connected');
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Connecting to database', {
          host: this.config.host,
          database: this.config.database,
          attempt,
        });

        this.pool = new Pool(this.config);

        // Test connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        this.isConnected = true;

        logger.info('Database connection established successfully', {
          host: this.config.host,
          database: this.config.database,
        });

        // Setup pool event handlers
        this.setupPoolHandlers();

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.warn('Database connection failed, retrying', {
            attempt,
            nextRetryIn: delay,
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    this.isConnected = false;
    throw new Error(
      `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Setup pool event handlers
   */
  private setupPoolHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      this.activeConnections++;
      logger.debug('Database connection acquired', {
        activeConnections: this.activeConnections,
      });
    });

    this.pool.on('remove', () => {
      this.activeConnections--;
      logger.debug('Database connection released', {
        activeConnections: this.activeConnections,
      });
    });

    this.pool.on('error', (error) => {
      logger.error('Database pool error', {
        error: error.message,
      });
    });
  }

  /**
   * Execute a single query with optional retry logic
   */
  public async query<T extends any = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<any> {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const { timeout = 30000, retries = 1 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await this.pool.connect();

        try {
          // Set statement timeout
          await client.query(`SET statement_timeout = ${timeout}`);

          const result = await client.query(sql, params);
          logger.debug('Query executed', {
            sql: sql.substring(0, 100),
            rowCount: result.rowCount,
            attempt,
          });

          return result;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 100;
          logger.warn('Query failed, retrying', {
            sql: sql.substring(0, 100),
            attempt,
            nextRetryIn: delay,
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Query failed');
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T = any>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      logger.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      logger.debug('Transaction committed');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<{ healthy: boolean; responseTime: number }> {
    if (!this.isConnected) {
      return { healthy: false, responseTime: 0 };
    }

    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;

      return { healthy: true, responseTime };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { healthy: false, responseTime: 0 };
    }
  }

  /**
   * Get pool statistics
   */
  public getPoolStats() {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0, activeConnections: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeConnections: this.activeConnections,
    };
  }

  /**
   * Graceful shutdown with connection draining
   */
  public async disconnect(timeout: number = 10000): Promise<void> {
    if (!this.pool) return;

    logger.info('Starting database shutdown', {
      activeConnections: this.activeConnections,
    });

    // Stop accepting new connections
    this.isConnected = false;

    // Wait for active connections to drain
    const startTime = Date.now();
    while (this.activeConnections > 0 && Date.now() - startTime < timeout) {
      await this.sleep(100);
    }

    if (this.activeConnections > 0) {
      logger.warn('Forcing database pool shutdown with active connections', {
        activeConnections: this.activeConnections,
      });
    }

    try {
      await this.pool.end();
      logger.info('Database pool closed successfully');
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.pool = null;
  }

  /**
   * Helper to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const database = Database.getInstance();

export async function initializeDatabase(): Promise<void> {
  try {
    await database.connect();
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export { Database, Client as DatabaseClient };
