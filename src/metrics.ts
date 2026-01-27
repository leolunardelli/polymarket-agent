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

export class MetricsCollector {
  private static instance: MetricsCollector;
  private apiCalls = 0;
  private apiErrors = 0;
  private latencies: number[] = [];
  private retries = 0;

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  recordApiCall(latency: number, error = false): void {
    this.apiCalls++;
    if (error) this.apiErrors++;
    this.latencies.push(latency);
    // Keep only last 1000 measurements to avoid memory bloat
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }
  }

  recordRetry(): void {
    this.retries++;
  }

  getMetrics(): Metrics {
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

  reset(): void {
    this.apiCalls = 0;
    this.apiErrors = 0;
    this.latencies = [];
    this.retries = 0;
  }
}

export const metrics = MetricsCollector.getInstance();
