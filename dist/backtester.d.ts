/**
 * Backtesting Framework (P1-HIGH #10)
 *
 * Replays saved market snapshots through a Strategy to evaluate
 * performance without waiting 7 days. Run hundreds of simulated
 * weeks in minutes.
 */
import type { Strategy, MarketSnapshot } from './strategy';
export interface BacktestConfig {
    initialBalance: number;
    maxPositionSize: number;
    maxConcurrentPositions: number;
    minCashReservePercent: number;
    /** Simulated cycle interval in milliseconds */
    cycleIntervalMs: number;
}
export interface BacktestResult {
    strategyName: string;
    cycles: number;
    totalTrades: number;
    winRate: number;
    returnPercent: number;
    maxDrawdown: number;
    profitFactor: number;
    sharpeRatio: number;
    finalBalance: number;
    durationMs: number;
}
export interface MarketTimeSeries {
    timestamp: number;
    markets: MarketSnapshot[];
}
export declare class Backtester {
    private strategy;
    private config;
    constructor(strategy: Strategy, config: BacktestConfig);
    /**
     * Run a backtest over a series of market snapshots.
     * Each entry in `data` represents one cycle's view of the world.
     */
    run(data: MarketTimeSeries[]): Promise<BacktestResult>;
}
//# sourceMappingURL=backtester.d.ts.map