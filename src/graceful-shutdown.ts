/**
 * Graceful Shutdown Handler
 * 
 * CRITICAL FOR DATA SAFETY
 * Ensures in-flight requests complete before process terminates
 * Prevents data loss during deployments
 */

import { logger } from './logger';

interface InFlightRequest {
  id: string;
  startTime: number;
  timeout: NodeJS.Timeout | null;
}

class GracefulShutdown {
  private inFlightRequests = new Map<string, InFlightRequest>();
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds to drain
  private requestIdCounter = 0;

  /**
   * Register a new request as in-flight
   * Returns a request ID to track the request
   */
  registerRequest(): string {
    if (this.isShuttingDown) {
      throw new Error('Server is shutting down, cannot accept new requests');
    }

    const id = `req_${++this.requestIdCounter}_${Date.now()}`;
    this.inFlightRequests.set(id, {
      id,
      startTime: Date.now(),
      timeout: null,
    });

    return id;
  }

  /**
   * Mark a request as complete
   */
  completeRequest(id: string): void {
    this.inFlightRequests.delete(id);
  }

  /**
   * Get number of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Check if server is shutting down
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Initiate graceful shutdown
   * Wait for requests to complete, then return
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Graceful shutdown initiated', {
      inFlightRequests: this.getInFlightCount(),
    });

    const startTime = Date.now();
    let lastLogTime = startTime;

    // Wait for all requests to complete
    while (this.getInFlightCount() > 0) {
      const elapsed = Date.now() - startTime;

      // Log progress every 5 seconds
      if (Date.now() - lastLogTime > 5000) {
        logger.info('Waiting for requests to drain', {
          remaining: this.getInFlightCount(),
          elapsed,
        });
        lastLogTime = Date.now();
      }

      // Timeout after shutdownTimeout
      if (elapsed > this.shutdownTimeout) {
        const remaining = this.getInFlightCount();
        logger.error('Shutdown timeout - forcing exit', {
          remaining,
          elapsed,
        });

        // Log remaining requests for debugging
        const requests = Array.from(this.inFlightRequests.values());
        for (const req of requests) {
          const duration = Date.now() - req.startTime;
          logger.error('Abandoned request', {
            id: req.id,
            duration,
          });
        }

        return; // Force exit
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Graceful shutdown complete - all requests drained');
  }

  /**
   * Set custom shutdown timeout
   */
  setShutdownTimeout(ms: number): void {
    this.shutdownTimeout = ms;
  }
}

// Singleton instance
const shutdown = new GracefulShutdown();

/**
 * Setup signal handlers for graceful shutdown
 * Call this in your main application entry point
 * 
 * Usage:
 *   import { setupGracefulShutdown } from './graceful-shutdown';
 *   setupGracefulShutdown();
 */
export function setupGracefulShutdown(): void {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        await shutdown.shutdown();
        logger.info('Graceful shutdown complete, exiting');
        process.exit(0);
      } catch (error) {
        logger.error('Graceful shutdown failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Attempt graceful shutdown
    try {
      await shutdown.shutdown();
    } catch {
      // Ignore errors during shutdown
    }

    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason: String(reason),
      promise: String(promise),
    });

    // Attempt graceful shutdown
    try {
      await shutdown.shutdown();
    } catch {
      // Ignore errors during shutdown
    }

    process.exit(1);
  });

  logger.info('Graceful shutdown handlers registered');
}

export { shutdown };
export const { registerRequest, completeRequest, getInFlightCount, isShutdownInProgress } =
  {
    registerRequest: () => shutdown.registerRequest(),
    completeRequest: (id: string) => shutdown.completeRequest(id),
    getInFlightCount: () => shutdown.getInFlightCount(),
    isShutdownInProgress: () => shutdown.isShutdownInProgress(),
  };
