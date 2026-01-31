/**
 * Graceful Shutdown Handler
 *
 * CRITICAL FOR DATA SAFETY
 * Ensures in-flight requests complete before process terminates
 * Prevents data loss during deployments
 */
declare class GracefulShutdown {
    private inFlightRequests;
    private isShuttingDown;
    private shutdownTimeout;
    private requestIdCounter;
    /**
     * Register a new request as in-flight
     * Returns a request ID to track the request
     */
    registerRequest(): string;
    /**
     * Mark a request as complete
     */
    completeRequest(id: string): void;
    /**
     * Get number of in-flight requests
     */
    getInFlightCount(): number;
    /**
     * Check if server is shutting down
     */
    isShutdownInProgress(): boolean;
    /**
     * Initiate graceful shutdown
     * Wait for requests to complete, then return
     */
    shutdown(): Promise<void>;
    /**
     * Set custom shutdown timeout
     */
    setShutdownTimeout(ms: number): void;
}
declare const shutdown: GracefulShutdown;
/**
 * Setup signal handlers for graceful shutdown
 * Call this in your main application entry point
 *
 * Usage:
 *   import { setupGracefulShutdown } from './graceful-shutdown';
 *   setupGracefulShutdown();
 */
export declare function setupGracefulShutdown(): void;
export { shutdown };
export declare const registerRequest: () => string, completeRequest: (id: string) => void, getInFlightCount: () => number, isShutdownInProgress: () => boolean;
//# sourceMappingURL=graceful-shutdown.d.ts.map