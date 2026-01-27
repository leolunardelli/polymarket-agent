/**
 * Leaderboard Analyzer Module
 * Analyzes Polymarket data to identify highest winrate traders
 * Uses /positions and /activity APIs to calculate real metrics
 * 
 * NOTE: Polymarket has NO public leaderboard API.
 * This module uses position/activity data to calculate win rates.
 */

import { logger } from './logger';

// Data API response types based on real API testing
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
  winRate: number; // percentage - calculated from resolved positions
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

// Known top trader addresses from Polymarket (discovered via API testing)
const KNOWN_TOP_TRADERS = [
  '0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee', // kch123
  '0x8d8f3f5c8b4d5c4e2b8a1e9c3f5d7b9a1c3e5f7d', // Example addresses
];

class LeaderboardAnalyzer {
  private readonly dataApiUrl = 'https://data-api.polymarket.com';
  private snapshots: Map<string, LeaderboardSnapshot> = new Map();
  private readonly cacheTTL = 300000; // 5 minutes
  private knownTraders: string[] = [...KNOWN_TOP_TRADERS];

  constructor() {
    logger.info('LeaderboardAnalyzer initialized - using real Data API');
  }

  /**
   * Add trader addresses to track
   */
  addTrackedTraders(addresses: string[]): void {
    for (const addr of addresses) {
      if (!this.knownTraders.includes(addr.toLowerCase())) {
        this.knownTraders.push(addr.toLowerCase());
      }
    }
    logger.info('Added tracked traders', { count: addresses.length });
  }

  /**
   * Fetch positions for a trader from the REAL Data API
   */
  private async fetchPositions(address: string, limit: number = 100): Promise<PositionData[]> {
    const url = `${this.dataApiUrl}/positions?user=${address}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json() as PositionData[] | { value?: PositionData[] };
      // API can return array directly or wrapped in {value: []}
      return Array.isArray(data) ? data : (data.value || []);
    } catch (error) {
      logger.error('Failed to fetch positions from Data API', {
        address,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch activity for a trader from the REAL Data API
   */
  private async fetchActivity(address: string, limit: number = 100): Promise<ActivityData[]> {
    const url = `${this.dataApiUrl}/activity?user=${address}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json() as ActivityData[] | { value?: ActivityData[] };
      // API can return array directly or wrapped in {value: []}
      return Array.isArray(data) ? data : (data.value || []);
    } catch (error) {
      logger.error('Failed to fetch activity from Data API', {
        address,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate trader metrics from REAL position and activity data
   */
  private async calculateTraderMetrics(address: string): Promise<TraderMetrics | null> {
    try {
      const [positions, activity] = await Promise.all([
        this.fetchPositions(address, 200),
        this.fetchActivity(address, 500),
      ]);

      if (positions.length === 0 && activity.length === 0) {
        logger.debug('No data found for trader', { address });
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

      return {
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
    } catch (error) {
      logger.error('Failed to calculate trader metrics', {
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
  async getTopTradersByWinRate(
    period: 'week' | 'month' | 'all-time' = 'month',
    limit: number = 20
  ): Promise<TraderMetrics[]> {
    const cacheKey = `leaderboard_${period}`;
    const cached = this.snapshots.get(cacheKey);

    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTTL) {
      logger.debug('Returning cached leaderboard data', { period, age: 'fresh' });
      return cached.topTraders.slice(0, limit);
    }

    try {
      logger.info('Fetching real trader data from Data API', { period, limit });

      // Fetch metrics for all known traders in parallel
      const metricsPromises = this.knownTraders.map(addr => this.calculateTraderMetrics(addr));
      const results = await Promise.all(metricsPromises);

      // Filter out null results and sort by win rate
      const traders = results
        .filter((m): m is TraderMetrics => m !== null)
        .sort((a, b) => b.winRate - a.winRate)
        .map((trader, index) => ({ ...trader, rank: index + 1 }));

      // Cache the results
      const snapshot: LeaderboardSnapshot = {
        timestamp: new Date(),
        period,
        topTraders: traders,
        totalTraders: traders.length,
      };
      this.snapshots.set(cacheKey, snapshot);

      logger.info('Leaderboard data fetched from real APIs', {
        period,
        topTraders: traders.length,
        topWinRate: traders[0]?.winRate || 0,
      });

      return traders.slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch leaderboard data', {
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
  async compareTimeframePnL(address: string): Promise<{
    weeklyPnL: number;
    monthlyPnL: number;
    trend: 'improving' | 'declining' | 'stable';
    consistency: number;
    weeklyWinRate: number;
    monthlyWinRate: number;
  }> {
    try {
      logger.debug('Comparing timeframe PnL', { address });

      const metrics = await this.calculateTraderMetrics(address);
      
      if (!metrics) {
        throw new Error(`No data found for trader: ${address}`);
      }

      // Determine trend based on weekly vs monthly average
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      const monthlyAvgWeekly = metrics.monthlyPnL / 4; // Approximate weekly from monthly
      
      if (metrics.weeklyPnL > monthlyAvgWeekly * 1.2) {
        trend = 'improving';
      } else if (metrics.weeklyPnL < monthlyAvgWeekly * 0.8) {
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
    } catch (error) {
      logger.error('Failed to compare timeframe PnL', {
        address,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get individual trader metrics from REAL API data
   */
  async getTraderMetrics(
    address: string,
    _period: 'week' | 'month' | 'all-time' = 'month'
  ): Promise<TraderMetrics> {
    try {
      logger.debug('Fetching trader metrics from real API', { address });

      // Ensure this trader is tracked
      if (!this.knownTraders.includes(address.toLowerCase())) {
        this.knownTraders.push(address.toLowerCase());
      }

      const metrics = await this.calculateTraderMetrics(address);

      if (!metrics) {
        throw new Error(`No data found for trader: ${address}`);
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get trader metrics', {
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
  async identifyTopPerformers(
    _period: 'week' | 'month' = 'month',
    minWinRate: number = 55,
    minTrades: number = 10,
    limit: number = 10
  ): Promise<TraderMetrics[]> {
    try {
      logger.info('Identifying top performers from real data', {
        minWinRate,
        minTrades,
        limit,
      });

      // Fetch metrics for all tracked traders
      const metricsPromises = this.knownTraders.map(addr => this.calculateTraderMetrics(addr));
      const results = await Promise.all(metricsPromises);

      const filtered = results
        .filter((m): m is TraderMetrics => m !== null)
        .filter(t => t.winRate >= minWinRate && t.totalTrades >= minTrades)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, limit)
        .map((trader, index) => ({ ...trader, rank: index + 1 }));

      logger.info('Top performers identified from real data', {
        count: filtered.length,
        topWinRate: filtered[0]?.winRate || 0,
      });

      return filtered;
    } catch (error) {
      logger.error('Failed to identify top performers', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current leaderboard snapshot
   */
  getSnapshot(period: 'week' | 'month' = 'month'): LeaderboardSnapshot | null {
    return this.snapshots.get(`leaderboard_${period}`) || null;
  }

  /**
   * Clear cached leaderboard data
   */
  clearCache(): void {
    this.snapshots.clear();
    logger.info('Leaderboard cache cleared');
  }

  /**
   * Get list of currently tracked traders
   */
  getTrackedTraders(): string[] {
    return [...this.knownTraders];
  }

  /**
   * Get metrics summary comparing multiple traders
   */
  async getComparisonMetrics(addresses: string[]): Promise<{
    topTrader: TraderMetrics;
    averageMetrics: Partial<TraderMetrics>;
    consistency: { address: string; score: number }[];
  }> {
    try {
      logger.info('Getting comparison metrics for traders', {
        count: addresses.length,
      });

      // Ensure all addresses are tracked
      this.addTrackedTraders(addresses);

      const metricsPromises = addresses.map(addr => this.calculateTraderMetrics(addr));
      const results = await Promise.all(metricsPromises);
      const metrics = results.filter((m): m is TraderMetrics => m !== null);

      if (metrics.length === 0) {
        throw new Error('No valid trader data found for comparison');
      }

      const topTrader = metrics.reduce((prev, current) =>
        current.winRate > prev.winRate ? current : prev
      );

      // Calculate averages
      const avgWinRate =
        metrics.reduce((sum, m) => sum + m.winRate, 0) / metrics.length;
      const avgPnL =
        metrics.reduce((sum, m) => sum + m.monthlyPnL, 0) / metrics.length;

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
    } catch (error) {
      logger.error('Failed to get comparison metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export { LeaderboardAnalyzer };
