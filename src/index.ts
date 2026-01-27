/**
 * Application Entry Point
 * Complete production setup with all dependencies initialized
 */

import { logger } from './logger';
import { getConfig, validateNoHardcodedSecrets } from './env-config';
import { getServer } from './server';
import { initializeDatabase } from './database';

/**
 * Initialize application in correct order
 */
async function initializeApplication(): Promise<void> {
  try {
    // 1. Validate environment
    logger.info('Starting application initialization');
    validateNoHardcodedSecrets();

    // 2. Load and validate config
    const config = getConfig();
    logger.info('Configuration loaded successfully', {
      environment: config.environment,
      database: config.database.url,
      port: config.port,
    });

    // 3. Initialize database
    logger.info('Initializing database connection');
    await initializeDatabase();

    // 4. Start HTTP server
    logger.info('Starting HTTP server');
    const server = getServer();
    await server.start();

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start application if run directly
if (require.main === module) {
  initializeApplication().catch((error: any) => {
    logger.error('Unhandled initialization error', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}

export { initializeApplication };
