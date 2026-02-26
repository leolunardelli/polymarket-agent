/**
 * Leaderboard Analyzer Module
 * Analyzes Polymarket data to identify highest winrate traders
 * Uses /positions and /activity APIs to calculate real metrics
 *
 * NOTE: Polymarket has NO public leaderboard API.
 * This module uses position/activity data to calculate win rates.
 */
export interface PositionData {
    proxyWallet: string;
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    initialValue: number;
    currentValue: number;
    cashPnl: number;
    percentPnl: number;
    totalBought: number;
    realizedPnl: number;
    percentRealizedPnl: number;
    curPrice: number;
    redeemable: boolean;
    mergeable: boolean;
    title: string;
    slug: string;
    icon: string;
    eventId: string;
    eventSlug: string;
    outcome: string;
    outcomeIndex: number;
    oppositeOutcome: string;
    oppositeAsset: string;
    endDate: string;
    negativeRisk: boolean;
}
export interface ActivityData {
    proxyWallet: string;
    timestamp: number;
    conditionId: string;
    type: string;
    size: number;
    usdcSize: number;
    transactionHash: string;
    price: number;
    asset: string;
    side: 'BUY' | 'SELL';
    outcomeIndex: number;
    title: string;
    slug: string;
    icon: string;
    eventSlug: string;
    outcome: string;
    name: string;
    pseudonym: string;
    bio: string;
    profileImage: string;
    profileImageOptimized: string;
}
export interface TraderMetrics {
    address: string;
    username?: string;
    winRate: number;
    resolvedTrades: number;
    monthlyPnL: number;
    weeklyPnL: number;
    totalTrades: number;
    profitableTrades: number;
    averageWin: number;
    averageLoss: number;
    sharpeRatio?: number;
    rank: number;
    lastUpdated: Date;
    dataSource: 'positions' | 'activity' | 'aggregate';
}
export interface LeaderboardSnapshot {
    timestamp: Date;
    period: 'week' | 'month' | 'all-time';
    topTraders: TraderMetrics[];
    totalTraders: number;
}
export interface SmartMoneySignals {
    marketSet: Set<string>;
    preferredOutcome: Map<string, number>;
    selectedTraders: number;
}
declare class LeaderboardAnalyzer {
    private readonly dataApiUrl;
    private snapshots;
    private readonly cacheTTL;
    private knownTraders;
    private traderMetricsCache;
    private readonly traderCacheTTL;
    private discoveryDone;
    private smartMoneyCache;
    private readonly smartMoneyCacheTTL;
    constructor();
    /**
     * Add trader addresses to track
     */
    addTrackedTraders(addresses: string[]): void;
    /**
     * P2 #10: Discover active high-volume traders from the activity API.
     * Fetches recent trades and identifies unique wallets with many transactions.
     */
    discoverTopTraders(minTrades?: number): Promise<string[]>;
    private traderQualityScore;
    getSmartMoneySignals(period?: 'week' | 'month' | 'all-time', limit?: number): Promise<SmartMoneySignals>;
    /**
     * Fetch positions for a trader from the REAL Data API
     */
    private fetchPositions;
    /**
     * Fetch activity for a trader from the REAL Data API
     */
    private fetchActivity;
    /**
     * Calculate trader metrics from REAL position and activity data
     */
    private calculateTraderMetrics;
    /**
     * Fetch leaderboard data by aggregating real API data
     * Returns top traders with highest win rates
     */
    getTopTradersByWinRate(period?: 'week' | 'month' | 'all-time', limit?: number): Promise<TraderMetrics[]>;
    /**
     * Compare month and week PnL for a trader
     * Returns metrics on consistency and trend
     */
    compareTimeframePnL(address: string): Promise<{
        weeklyPnL: number;
        monthlyPnL: number;
        trend: 'improving' | 'declining' | 'stable';
        consistency: number;
        weeklyWinRate: number;
        monthlyWinRate: number;
    }>;
    /**
     * Get individual trader metrics from REAL API data
     */
    getTraderMetrics(address: string, _period?: 'week' | 'month' | 'all-time'): Promise<TraderMetrics>;
    /**
     * Identify traders with best win rates in the current period
     * Filters by minimum profitability threshold
     */
    identifyTopPerformers(_period?: 'week' | 'month', minWinRate?: number, minTrades?: number, limit?: number): Promise<TraderMetrics[]>;
    /**
     * Get current leaderboard snapshot
     */
    getSnapshot(period?: 'week' | 'month'): LeaderboardSnapshot | null;
    /**
     * Clear cached leaderboard data
     */
    clearCache(): void;
    /**
     * Get list of currently tracked traders
     */
    getTrackedTraders(): string[];
    /**
     * Get metrics summary comparing multiple traders
     */
    getComparisonMetrics(addresses: string[]): Promise<{
        topTrader: TraderMetrics;
        averageMetrics: Partial<TraderMetrics>;
        consistency: {
            address: string;
            score: number;
        }[];
    }>;
}
export { LeaderboardAnalyzer };
//# sourceMappingURL=leaderboard-analyzer.d.ts.map