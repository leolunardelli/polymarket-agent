export interface Metrics {
    apiCalls: number;
    apiErrors: number;
    errorRate: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    retries: number;
    timestamp: string;
}
export declare class MetricsCollector {
    private static instance;
    private apiCalls;
    private apiErrors;
    private latencies;
    private retries;
    private constructor();
    static getInstance(): MetricsCollector;
    recordApiCall(latency: number, error?: boolean): void;
    recordRetry(): void;
    getMetrics(): Metrics;
    reset(): void;
}
export declare const metrics: MetricsCollector;
//# sourceMappingURL=metrics.d.ts.map