"use strict";
/**
 * Leaderboard Analyzer Module
 * Analyzes Polymarket data to identify highest winrate traders
 * Uses /positions and /activity APIs to calculate real metrics
 *
 * NOTE: Polymarket has NO public leaderboard API.
 * This module uses position/activity data to calculate win rates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardAnalyzer = void 0;
const logger_1 = require("./logger");
// P2 #10: Seed addresses — will be supplemented by discoverTopTraders()
const KNOWN_TOP_TRADERS = [
    '0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee', // kch123
];
class LeaderboardAnalyzer {
    constructor() {
        this.dataApiUrl = 'https://data-api.polymarket.com';
        this.snapshots = new Map();
        this.cacheTTL = 300000; // 5 minutes
        this.knownTraders = [...KNOWN_TOP_TRADERS];
        // P2 #11: Cache individual trader metrics (30 min TTL)
        this.traderMetricsCache = new Map();
        this.traderCacheTTL = 30 * 60 * 1000; // 30 minutes
        this.discoveryDone = false;
        this.smartMoneyCache = null;
        this.smartMoneyCacheTTL = 30 * 60 * 1000; // 30 minutes
        logger_1.logger.info('LeaderboardAnalyzer initialized - using real Data API');
    }
    /**
     * Add trader addresses to track
     */
    addTrackedTraders(addresses) {
        for (const addr of addresses) {
            if (!this.knownTraders.includes(addr.toLowerCase())) {
                this.knownTraders.push(addr.toLowerCase());
            }
        }
        logger_1.logger.info('Added tracked traders', { count: addresses.length });
    }
    /**
     * P2 #10: Discover active high-volume traders from the activity API.
     * Fetches recent trades and identifies unique wallets with many transactions.
     */
    async discoverTopTraders(minTrades = 10) {
        if (this.discoveryDone)
            return this.knownTraders;
        try {
            const urls = [
                `${this.dataApiUrl}/activity?limit=500`,
                `${this.dataApiUrl}/activity?limit=1000`,
            ];
            const batches = await Promise.all(urls.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok)
                        return [];
                    const data = await response.json();
                    return Array.isArray(data) ? data : (data.value || []);
                }
                catch {
                    return [];
                }
            }));
            const dedupe = new Set();
            const activities = [];
            for (const batch of batches) {
                for (const act of batch) {
                    const key = `${act.transactionHash}_${act.proxyWallet}_${act.timestamp}`;
                    if (dedupe.has(key))
                        continue;
                    dedupe.add(key);
                    activities.push(act);
                }
            }
            if (activities.length === 0) {
                logger_1.logger.warn('Trader discovery: no activity data');
                return this.knownTraders;
            }
            // Count trades per wallet
            const walletStats = new Map();
            for (const act of activities) {
                const wallet = act.proxyWallet?.toLowerCase();
                if (wallet) {
                    const existing = walletStats.get(wallet) || { trades: 0, notional: 0, uniqueMarkets: new Set() };
                    existing.trades += 1;
                    existing.notional += Math.abs(act.usdcSize || 0);
                    if (act.conditionId)
                        existing.uniqueMarkets.add(act.conditionId);
                    walletStats.set(wallet, existing);
                }
            }
            // Add wallets that appear frequently and have meaningful notional/coverage
            const ranked = Array.from(walletStats.entries())
                .filter(([, stats]) => stats.trades >= minTrades && stats.notional >= 1000)
                .sort((a, b) => {
                const scoreA = a[1].trades * 0.6 + a[1].uniqueMarkets.size * 0.3 + Math.log10(a[1].notional + 1) * 3;
                const scoreB = b[1].trades * 0.6 + b[1].uniqueMarkets.size * 0.3 + Math.log10(b[1].notional + 1) * 3;
                return scoreB - scoreA;
            })
                .slice(0, 80);
            const discovered = [];
            for (const [wallet] of ranked) {
                if (!this.knownTraders.includes(wallet)) {
                    this.knownTraders.push(wallet);
                    discovered.push(wallet);
                }
            }
            this.discoveryDone = true;
            logger_1.logger.info('Trader discovery complete', {
                activitiesScanned: activities.length,
                newTraders: discovered.length,
                totalTracked: this.knownTraders.length,
            });
            return this.knownTraders;
        }
        catch (error) {
            logger_1.logger.error('Trader discovery failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.knownTraders;
        }
    }
    async getSmartMoneySignals(period = 'week', limit = 30) {
        if (this.smartMoneyCache && Date.now() - this.smartMoneyCache.fetchedAt < this.smartMoneyCacheTTL) {
            return this.smartMoneyCache.data;
        }
        await this.discoverTopTraders(8);
        const leaderboard = await this.getTopTradersByWinRate(period, 60);
        const selected = leaderboard
            .filter((t) => t.totalTrades >= 30)
            .filter((t) => t.winRate >= 50)
            .filter((t) => (period === 'week' ? t.weeklyPnL >= -200 : t.monthlyPnL >= -500))
            .sort((a, b) => {
            const aScore = a.winRate * 0.6 + Math.log10(a.totalTrades + 1) * 20 + Math.max(0, a.weeklyPnL) / 200;
            const bScore = b.winRate * 0.6 + Math.log10(b.totalTrades + 1) * 20 + Math.max(0, b.weeklyPnL) / 200;
            return bScore - aScore;
        })
            .slice(0, limit);
        // Fallback path: if strict filters yield zero traders, still copy the best
        // available profiles so signal doesn't collapse to empty.
        const selectedFinal = selected.length > 0
            ? selected
            : leaderboard
                .filter((t) => t.totalTrades >= 5)
                .sort((a, b) => {
                const aScore = a.winRate * 0.5 + Math.log10(a.totalTrades + 1) * 18 + Math.max(0, a.weeklyPnL) / 300;
                const bScore = b.winRate * 0.5 + Math.log10(b.totalTrades + 1) * 18 + Math.max(0, b.weeklyPnL) / 300;
                return bScore - aScore;
            })
                .slice(0, Math.min(10, limit));
        const marketScore = new Map();
        const outcomeScore = new Map();
        await Promise.all(selectedFinal.map(async (trader) => {
            try {
                const positions = await this.fetchPositions(trader.address, 120);
                const active = positions
                    .filter((p) => !p.redeemable)
                    .filter((p) => p.size > 0)
                    .filter((p) => !p.endDate || new Date(p.endDate).getTime() > Date.now());
                const traderWeight = Math.max(1, (trader.winRate - 45) / 10) + Math.log10(trader.totalTrades + 1);
                for (const pos of active) {
                    if (!pos.conditionId)
                        continue;
                    const conditionId = pos.conditionId;
                    const pnlBoost = pos.percentPnl > 0 ? 0.5 : 0;
                    const sizeBoost = Math.min(3, Math.log10(Math.max(1, pos.currentValue) + 1));
                    const increment = traderWeight + pnlBoost + sizeBoost;
                    marketScore.set(conditionId, (marketScore.get(conditionId) || 0) + increment);
                    const bucket = outcomeScore.get(conditionId) || { zero: 0, one: 0 };
                    if (pos.outcomeIndex === 1)
                        bucket.one += increment;
                    else
                        bucket.zero += increment;
                    outcomeScore.set(conditionId, bucket);
                }
            }
            catch (error) {
                logger_1.logger.debug('Smart-money positions fetch failed', {
                    address: trader.address,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }));
        const rankedMarkets = Array.from(marketScore.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 120);
        const marketSet = new Set();
        const preferredOutcome = new Map();
        for (const [conditionId, score] of rankedMarkets) {
            if (score < 4)
                continue;
            marketSet.add(conditionId);
            const outcome = outcomeScore.get(conditionId);
            if (outcome) {
                preferredOutcome.set(conditionId, outcome.one > outcome.zero ? 1 : 0);
            }
        }
        const result = {
            marketSet,
            preferredOutcome,
            selectedTraders: selectedFinal.length,
        };
        this.smartMoneyCache = { data: result, fetchedAt: Date.now() };
        logger_1.logger.info('Smart-money signals built', {
            selectedTraders: selectedFinal.length,
            markets: marketSet.size,
        });
        return result;
    }
    /**
     * Fetch positions for a trader from the REAL Data API
     */
    async fetchPositions(address, limit = 100) {
        const url = `${this.dataApiUrl}/positions?user=${address}&limit=${limit}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // API can return array directly or wrapped in {value: []}
            return Array.isArray(data) ? data : (data.value || []);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch positions from Data API', {
                address,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Fetch activity for a trader from the REAL Data API
     */
    async fetchActivity(address, limit = 100) {
        const url = `${this.dataApiUrl}/activity?user=${address}&limit=${limit}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // API can return array directly or wrapped in {value: []}
            return Array.isArray(data) ? data : (data.value || []);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch activity from Data API', {
                address,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Calculate trader metrics from REAL position and activity data
     */
    async calculateTraderMetrics(address) {
        // P2 #11: Check per-trader cache first
        const cached = this.traderMetricsCache.get(address);
        if (cached && Date.now() - cached.fetchedAt < this.traderCacheTTL) {
            return cached.data;
        }
        try {
            const [positions, activity] = await Promise.all([
                this.fetchPositions(address, 200),
                this.fetchActivity(address, 500),
            ]);
            if (positions.length === 0 && activity.length === 0) {
                logger_1.logger.debug('No data found for trader', { address });
                return null;
            }
            // Get username from activity data
            const username = activity.length > 0 ? activity[0].name || activity[0].pseudonym : undefined;
            // Calculate metrics from RESOLVED positions (redeemable = resolved)
            const resolvedPositions = positions.filter(p => p.redeemable);
            const profitablePositions = resolvedPositions.filter(p => p.cashPnl > 0);
            const losingPositions = resolvedPositions.filter(p => p.cashPnl < 0);
            // Calculate win rate from resolved positions
            const winRate = resolvedPositions.length > 0
                ? (profitablePositions.length / resolvedPositions.length) * 100
                : 0;
            // Calculate total PnL
            const totalPnL = positions.reduce((sum, p) => sum + p.cashPnl, 0);
            const realizedPnL = positions.reduce((sum, p) => sum + p.realizedPnl, 0);
            // Calculate average win/loss
            const totalWins = profitablePositions.reduce((sum, p) => sum + p.cashPnl, 0);
            const totalLosses = losingPositions.reduce((sum, p) => sum + Math.abs(p.cashPnl), 0);
            const averageWin = profitablePositions.length > 0 ? totalWins / profitablePositions.length : 0;
            const averageLoss = losingPositions.length > 0 ? -totalLosses / losingPositions.length : 0;
            // Estimate weekly/monthly (rough based on activity timestamps)
            const now = Date.now();
            const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
            const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
            const weeklyActivity = activity.filter(a => a.timestamp * 1000 > oneWeekAgo);
            const monthlyActivity = activity.filter(a => a.timestamp * 1000 > oneMonthAgo);
            // Rough PnL estimation from recent activity (not exact, but real data)
            const weeklyPnL = weeklyActivity.reduce((sum, a) => {
                return sum + (a.side === 'SELL' ? a.usdcSize : -a.usdcSize);
            }, 0);
            const monthlyPnL = monthlyActivity.reduce((sum, a) => {
                return sum + (a.side === 'SELL' ? a.usdcSize : -a.usdcSize);
            }, 0);
            const result = {
                address,
                username,
                winRate: Math.round(winRate * 100) / 100,
                monthlyPnL,
                weeklyPnL,
                totalTrades: activity.length,
                profitableTrades: profitablePositions.length,
                averageWin,
                averageLoss,
                rank: 0, // Will be calculated when sorting
                lastUpdated: new Date(),
                dataSource: 'aggregate',
            };
            // P2 #11: Store in per-trader cache
            this.traderMetricsCache.set(address, { data: result, fetchedAt: Date.now() });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate trader metrics', {
                address,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Fetch leaderboard data by aggregating real API data
     * Returns top traders with highest win rates
     */
    async getTopTradersByWinRate(period = 'month', limit = 20) {
        const cacheKey = `leaderboard_${period}`;
        const cached = this.snapshots.get(cacheKey);
        // Return cached data if fresh
        if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTTL) {
            logger_1.logger.debug('Returning cached leaderboard data', { period, age: 'fresh' });
            return cached.topTraders.slice(0, limit);
        }
        try {
            logger_1.logger.info('Fetching real trader data from Data API', { period, limit });
            // Fetch metrics for all known traders in parallel
            const metricsPromises = this.knownTraders.map(addr => this.calculateTraderMetrics(addr));
            const results = await Promise.all(metricsPromises);
            // Filter out null results and sort by win rate
            const traders = results
                .filter((m) => m !== null)
                .sort((a, b) => b.winRate - a.winRate)
                .map((trader, index) => ({ ...trader, rank: index + 1 }));
            // Cache the results
            const snapshot = {
                timestamp: new Date(),
                period,
                topTraders: traders,
                totalTraders: traders.length,
            };
            this.snapshots.set(cacheKey, snapshot);
            logger_1.logger.info('Leaderboard data fetched from real APIs', {
                period,
                topTraders: traders.length,
                topWinRate: traders[0]?.winRate || 0,
            });
            return traders.slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch leaderboard data', {
                period,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Compare month and week PnL for a trader
     * Returns metrics on consistency and trend
     */
    async compareTimeframePnL(address) {
        try {
            logger_1.logger.debug('Comparing timeframe PnL', { address });
            const metrics = await this.calculateTraderMetrics(address);
            if (!metrics) {
                throw new Error(`No data found for trader: ${address}`);
            }
            // Determine trend based on weekly vs monthly average
            let trend = 'stable';
            const monthlyAvgWeekly = metrics.monthlyPnL / 4; // Approximate weekly from monthly
            if (metrics.weeklyPnL > monthlyAvgWeekly * 1.2) {
                trend = 'improving';
            }
            else if (metrics.weeklyPnL < monthlyAvgWeekly * 0.8) {
                trend = 'declining';
            }
            // Consistency is based on win rate (higher = more consistent)
            const consistency = metrics.winRate;
            return {
                weeklyPnL: metrics.weeklyPnL,
                monthlyPnL: metrics.monthlyPnL,
                trend,
                consistency,
                weeklyWinRate: metrics.winRate, // Same win rate for now (API limitation)
                monthlyWinRate: metrics.winRate,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to compare timeframe PnL', {
                address,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get individual trader metrics from REAL API data
     */
    async getTraderMetrics(address, _period = 'month') {
        try {
            logger_1.logger.debug('Fetching trader metrics from real API', { address });
            // Ensure this trader is tracked
            if (!this.knownTraders.includes(address.toLowerCase())) {
                this.knownTraders.push(address.toLowerCase());
            }
            const metrics = await this.calculateTraderMetrics(address);
            if (!metrics) {
                throw new Error(`No data found for trader: ${address}`);
            }
            return metrics;
        }
        catch (error) {
            logger_1.logger.error('Failed to get trader metrics', {
                address,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Identify traders with best win rates in the current period
     * Filters by minimum profitability threshold
     */
    async identifyTopPerformers(_period = 'month', minWinRate = 55, minTrades = 10, limit = 10) {
        try {
            logger_1.logger.info('Identifying top performers from real data', {
                minWinRate,
                minTrades,
                limit,
            });
            // Fetch metrics for all tracked traders
            const metricsPromises = this.knownTraders.map(addr => this.calculateTraderMetrics(addr));
            const results = await Promise.all(metricsPromises);
            const filtered = results
                .filter((m) => m !== null)
                .filter(t => t.winRate >= minWinRate && t.totalTrades >= minTrades)
                .sort((a, b) => b.winRate - a.winRate)
                .slice(0, limit)
                .map((trader, index) => ({ ...trader, rank: index + 1 }));
            logger_1.logger.info('Top performers identified from real data', {
                count: filtered.length,
                topWinRate: filtered[0]?.winRate || 0,
            });
            return filtered;
        }
        catch (error) {
            logger_1.logger.error('Failed to identify top performers', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get current leaderboard snapshot
     */
    getSnapshot(period = 'month') {
        return this.snapshots.get(`leaderboard_${period}`) || null;
    }
    /**
     * Clear cached leaderboard data
     */
    clearCache() {
        this.snapshots.clear();
        logger_1.logger.info('Leaderboard cache cleared');
    }
    /**
     * Get list of currently tracked traders
     */
    getTrackedTraders() {
        return [...this.knownTraders];
    }
    /**
     * Get metrics summary comparing multiple traders
     */
    async getComparisonMetrics(addresses) {
        try {
            logger_1.logger.info('Getting comparison metrics for traders', {
                count: addresses.length,
            });
            // Ensure all addresses are tracked
            this.addTrackedTraders(addresses);
            const metricsPromises = addresses.map(addr => this.calculateTraderMetrics(addr));
            const results = await Promise.all(metricsPromises);
            const metrics = results.filter((m) => m !== null);
            if (metrics.length === 0) {
                throw new Error('No valid trader data found for comparison');
            }
            const topTrader = metrics.reduce((prev, current) => current.winRate > prev.winRate ? current : prev);
            // Calculate averages
            const avgWinRate = metrics.reduce((sum, m) => sum + m.winRate, 0) / metrics.length;
            const avgPnL = metrics.reduce((sum, m) => sum + m.monthlyPnL, 0) / metrics.length;
            // Calculate consistency scores (lower variance = higher consistency)
            const consistency = metrics.map(m => ({
                address: m.address,
                score: Math.abs(m.winRate - avgWinRate) * -1 + 100,
            }));
            return {
                topTrader,
                averageMetrics: {
                    winRate: avgWinRate,
                    monthlyPnL: avgPnL,
                },
                consistency,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get comparison metrics', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.LeaderboardAnalyzer = LeaderboardAnalyzer;
//# sourceMappingURL=leaderboard-analyzer.js.map