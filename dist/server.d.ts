/**
 * Main Application Server
 * Complete production-grade Express server with all middleware, error handling, and integration
 */
import { Express } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}
declare class ApplicationServer {
    private app;
    private apiClient;
    private config;
    constructor();
    /**
     * Setup all middleware in order
     */
    private setupMiddleware;
    /**
     * Setup all routes
     */
    private setupRoutes;
    /**
     * Setup centralized error handling
     */
    private setupErrorHandling;
    /**
     * Generate Prometheus metrics in text format
     */
    private getPrometheusMetrics;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Get Express app for testing
     */
    getApp(): Express;
}
export declare function getServer(): ApplicationServer;
export default ApplicationServer;
//# sourceMappingURL=server.d.ts.map