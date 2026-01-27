import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';
import { readdir, readFile } from 'fs/promises';
import { join, parse } from 'path';

/**
 * Migration interface
 */
export interface Migration {
  name: string;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

/**
 * Migration runner
 */
export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;
  private migrationsTable = '__migrations';

  constructor(pool: Pool, migrationsPath: string = './migrations') {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migrations table
   */
  async init(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          batch INT NOT NULL DEFAULT 0,
          duration_ms INT
        )
      `);

      logger.info('Migration table initialized', {
        meta: { table: this.migrationsTable },
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT name FROM ${this.migrationsTable} ORDER BY batch DESC, executed_at DESC`
      );

      return result.rows.map((row) => row.name);
    } finally {
      client.release();
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const executed = await this.getExecutedMigrations();

      return files
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
        .map((file) => parse(file).name)
        .filter((name) => !executed.includes(name))
        .sort();
    } catch (error) {
      logger.error('Failed to read migrations directory', {
        meta: { path: this.migrationsPath, error: String(error) },
      });
      return [];
    }
  }

  /**
   * Run pending migrations
   */
  async up(): Promise<number> {
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return 0;
    }

    const client = await this.pool.connect();
    let batch = 1;

    try {
      // Get the latest batch number
      const batchResult = await client.query(
        `SELECT COALESCE(MAX(batch), 0) as max_batch FROM ${this.migrationsTable}`
      );
      batch = batchResult.rows[0].max_batch + 1;

      await client.query('BEGIN');

      for (const migrationName of pendingMigrations) {
        const startTime = Date.now();

        try {
          logger.info(`Running migration: ${migrationName}`);

          // Load and execute migration
          const migration = await this.loadMigration(migrationName);
          await migration.up(client);

          const duration = Date.now() - startTime;

          // Record migration
          await client.query(
            `INSERT INTO ${this.migrationsTable} (name, batch, duration_ms) VALUES ($1, $2, $3)`,
            [migrationName, batch, duration]
          );

          logger.info(`Completed migration: ${migrationName}`, {
            meta: { duration_ms: duration },
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw new Error(`Migration ${migrationName} failed: ${String(error)}`);
        }
      }

      await client.query('COMMIT');
      logger.info(`Successfully ran ${pendingMigrations.length} migrations`, {
        meta: { count: pendingMigrations.length, batch },
      });

      return pendingMigrations.length;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback last migration batch
   */
  async down(steps: number = 1): Promise<number> {
    const client = await this.pool.connect();
    let rolledBack = 0;

    try {
      // Get last N migrations to rollback
      const result = await client.query(
        `SELECT name FROM ${this.migrationsTable} ORDER BY batch DESC, executed_at DESC LIMIT $1`,
        [steps]
      );

      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return 0;
      }

      await client.query('BEGIN');

      for (const { name } of result.rows) {
        try {
          logger.info(`Rolling back migration: ${name}`);

          const migration = await this.loadMigration(name);
          await migration.down(client);

          await client.query(
            `DELETE FROM ${this.migrationsTable} WHERE name = $1`,
            [name]
          );

          rolledBack++;
          logger.info(`Rolled back migration: ${name}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw new Error(`Rollback of ${name} failed: ${String(error)}`);
        }
      }

      await client.query('COMMIT');
      logger.info(`Rolled back ${rolledBack} migrations`);

      return rolledBack;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: string[];
    pending: string[];
    lastBatch: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    const client = await this.pool.connect();
    let lastBatch = 0;

    try {
      const result = await client.query(
        `SELECT COALESCE(MAX(batch), 0) as max_batch FROM ${this.migrationsTable}`
      );
      lastBatch = result.rows[0].max_batch;
    } finally {
      client.release();
    }

    return { executed, pending, lastBatch };
  }

  /**
   * Load migration file dynamically
   */
  private async loadMigration(name: string): Promise<Migration> {
    try {
      // Try .ts first (for development)
      const tsPath = join(this.migrationsPath, `${name}.ts`);
      const jsPath = join(this.migrationsPath, `${name}.js`);

      try {
        const content = await readFile(tsPath, 'utf-8');
        // For TypeScript files in Node.js runtime, we'd need ts-node or similar
        // For now, we'll assume JS files are used in production
        const mod = await import(tsPath);
        return mod.default || mod;
      } catch {
        const mod = await import(jsPath);
        return mod.default || mod;
      }
    } catch (error) {
      throw new Error(`Failed to load migration ${name}: ${String(error)}`);
    }
  }
}

/**
 * Create migration template
 */
export function createMigrationTemplate(name: string): string {
  const timestamp = Date.now();

  return `import { PoolClient } from 'pg';

/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export const up = async (client: PoolClient): Promise<void> => {
  await client.query(\`
    -- Add your UP migration SQL here
    -- Example: CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
  \`);
};

export const down = async (client: PoolClient): Promise<void> => {
  await client.query(\`
    -- Add your DOWN migration SQL here
    -- Example: DROP TABLE users;
  \`);
};

export default { up, down };
`;
}
