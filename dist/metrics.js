"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.MetricsCollector = void 0;
class MetricsCollector {
    constructor() {
        this.apiCalls = 0;
        this.apiErrors = 0;
        this.latencies = [];
        this.retries = 0;
    }
    static getInstance() {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }
    recordApiCall(latency, error = false) {
        this.apiCalls++;
        if (error)
            this.apiErrors++;
        this.latencies.push(latency);
        // Keep only last 1000 measurements to avoid memory bloat
        if (this.latencies.length > 1000) {
            this.latencies = this.latencies.slice(-1000);
        }
    }
    recordRetry() {
        this.retries++;
    }
    getMetrics() {
        const errorRate = this.apiCalls > 0 ? this.apiErrors / this.apiCalls : 0;
        const avgLatency = this.latencies.length > 0 ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 0;
        const minLatency = this.latencies.length > 0 ? Math.min(...this.latencies) : 0;
        const maxLatency = this.latencies.length > 0 ? Math.max(...this.latencies) : 0;
        return {
            apiCalls: this.apiCalls,
            apiErrors: this.apiErrors,
            errorRate,
            avgLatency,
            minLatency,
            maxLatency,
            retries: this.retries,
            timestamp: new Date().toISOString(),
        };
    }
    reset() {
        this.apiCalls = 0;
        this.apiErrors = 0;
        this.latencies = [];
        this.retries = 0;
    }
}
exports.MetricsCollector = MetricsCollector;
exports.metrics = MetricsCollector.getInstance();
//# sourceMappingURL=metrics.js.map