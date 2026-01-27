/**
 * 1-Week Virtual Trading Test
 * 
 * This test runs for 7 days using:
 * - REAL market data from Polymarket APIs
 * - Virtual tokens ($10,000 starting balance)
 * - Automated trading based on market analysis
 * 
 * Started: Will log actual start time
 * Duration: 7 days (168 hours)
 */

import { logger } from './logger';
import { TradingSimulator } from './trading-simulator';
import { LeaderboardAnalyzer } from './leaderboard-analyzer';
import { PolymarketAPI } from './polymarket-api';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  virtualBalance: 10000,
  testDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  checkIntervalMs: 5 * 60 * 1000, // Check markets every 5 minutes
  reportIntervalMs: 60 * 60 * 1000, // Report every hour
  maxPositionSize: 500, // Max $500 per position
  minProbability: 0.1, // Don't buy below 10%
  maxProbability: 0.9, // Don't buy above 90%
  targetProfitPercent: 20, // Take profit at 20% gain
  stopLossPercent: 15, // Stop loss at 15% loss
  logFile: 'test-results.json',
};

interface MarketData {
  conditionId: string;
  questionId: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  liquidity: number;
  endDate: string;
}

interface TestState {
  startTime: Date;
  endTime: Date;
  currentCycle: number;
  totalCycles: number;
  tradesExecuted: number;
  marketsAnalyzed: number;
  lastReportTime: Date;
  status: 'running' | 'completed' | 'error';
  errors: string[];
}

class WeekTest {
  private simulator: TradingSimulator;
  private analyzer: LeaderboardAnalyzer;
  private api: PolymarketAPI;
  private state: TestState;
  private marketPriceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor() {
    this.simulator = new TradingSimulator(CONFIG.virtualBalance);
    this.analyzer = new LeaderboardAnalyzer();
    this.api = new PolymarketAPI();
    
    const now = new Date();
    this.state = {
      startTime: now,
      endTime: new Date(now.getTime() + CONFIG.testDurationMs),
      currentCycle: 0,
      totalCycles: Math.floor(CONFIG.testDurationMs / CONFIG.checkIntervalMs),
      tradesExecuted: 0,
      marketsAnalyzed: 0,
      lastReportTime: now,
      status: 'running',
      errors: [],
    };
  }

  /**
   * Fetch active markets from Polymarket
   */
  private async fetchActiveMarkets(): Promise<MarketData[]> {
    try {
      const response = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=50');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const markets = await response.json() as any[];
      
      const validMarkets: MarketData[] = [];
      
      for (const m of markets) {
        if (!m.active || m.closed || !m.enableOrderBook) continue;
        
        // Parse outcomePrices - handle string or array
        let prices: number[] = [0.5, 0.5];
        try {
          if (typeof m.outcomePrices === 'string') {
            prices = JSON.parse(m.outcomePrices);
          } else if (Array.isArray(m.outcomePrices)) {
            prices = m.outcomePrices;
          }
          // Convert string prices to numbers
          prices = prices.map((p: any) => parseFloat(String(p)) || 0);
        } catch {
          prices = [0.5, 0.5];
        }

        // Skip if no valid prices
        if (prices[0] <= 0 || prices[0] >= 1) continue;
        
        // Parse outcomes
        let outcomes: string[] = ['Yes', 'No'];
        try {
          if (typeof m.outcomes === 'string') {
            outcomes = JSON.parse(m.outcomes);
          } else if (Array.isArray(m.outcomes)) {
            outcomes = m.outcomes;
          }
        } catch {
          outcomes = ['Yes', 'No'];
        }

        const volume = parseFloat(m.volume) || 0;
        if (volume < 1000) continue; // Skip low volume

        validMarkets.push({
          conditionId: m.conditionId,
          questionId: m.questionId || m.conditionId,
          question: m.question || 'Unknown',
          outcomes,
          outcomePrices: prices,
          volume,
          liquidity: parseFloat(m.liquidity) || 0,
          endDate: m.endDate || '',
        });
      }

      logger.debug('Fetched active markets', { count: validMarkets.length });
      return validMarkets;
    } catch (error) {
      logger.error('Failed to fetch markets', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Analyze a market and decide whether to trade
   */
  private analyzeMarket(market: MarketData): {
    shouldTrade: boolean;
    side: 'BUY' | 'SELL';
    outcomeIndex: number;
    reason: string;
    confidence: number;
  } {
    const price = market.outcomePrices[0]; // Yes price
    
    // Don't trade extreme probabilities
    if (price < CONFIG.minProbability || price > CONFIG.maxProbability) {
      return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: 'extreme probability', confidence: 0 };
    }

    // Simple momentum strategy: look for markets with good volume and mid-range prices
    // Higher volume = more confidence
    const volumeScore = Math.min(market.volume / 100000, 1); // Cap at 100k volume
    const liquidityScore = Math.min(market.liquidity / 50000, 1);
    
    // Prefer prices between 0.3 and 0.7 (more upside potential)
    const priceScore = 1 - Math.abs(price - 0.5) * 2;
    
    const confidence = (volumeScore * 0.4 + liquidityScore * 0.3 + priceScore * 0.3) * 100;
    
    // Trade if confidence > 50%
    if (confidence > 50) {
      // Buy Yes if price < 0.5, otherwise consider No (inverse)
      const outcomeIndex = price < 0.5 ? 0 : 1;
      return {
        shouldTrade: true,
        side: 'BUY',
        outcomeIndex,
        reason: `High confidence market (vol: $${market.volume.toFixed(0)}, liq: $${market.liquidity.toFixed(0)})`,
        confidence,
      };
    }

    return { shouldTrade: false, side: 'BUY', outcomeIndex: 0, reason: 'low confidence', confidence };
  }

  /**
   * Execute a trade based on analysis
   */
  private async executeTrade(market: MarketData, analysis: ReturnType<typeof this.analyzeMarket>): Promise<void> {
    const price = market.outcomePrices[analysis.outcomeIndex];
    const maxSpend = Math.min(CONFIG.maxPositionSize, this.simulator.getPortfolioState().balance * 0.1);
    const quantity = Math.floor(maxSpend / price);

    if (quantity < 1) {
      return;
    }

    try {
      const tokenId = `${market.conditionId}_${analysis.outcomeIndex}`;
      const symbol = `${market.question.slice(0, 30)}..._${market.outcomes[analysis.outcomeIndex]}`;

      await this.simulator.simulateBuy(tokenId, symbol, quantity, price);
      
      this.state.tradesExecuted++;
      this.marketPriceCache.set(tokenId, { price, timestamp: Date.now() });

      logger.info('Trade executed', {
        market: market.question.slice(0, 50),
        outcome: market.outcomes[analysis.outcomeIndex],
        quantity,
        price,
        totalValue: quantity * price,
        reason: analysis.reason,
      });
    } catch (error) {
      logger.warn('Trade failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check existing positions for exit signals
   */
  private async checkExitSignals(markets: MarketData[]): Promise<void> {
    const portfolio = this.simulator.getPortfolioState();
    
    for (const position of portfolio.positions) {
      // Parse tokenId to get market info
      const [conditionId, outcomeIndexStr] = position.tokenId.split('_');
      const outcomeIndex = parseInt(outcomeIndexStr) || 0;

      // Find current market price
      const market = markets.find(m => m.conditionId === conditionId);
      if (!market) continue;

      const currentPrice = market.outcomePrices[outcomeIndex];
      const entryPrice = position.entryPrice;
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      // Update position price
      this.simulator.updatePrices([{ tokenId: position.tokenId, price: currentPrice }]);

      // Check exit conditions
      if (pnlPercent >= CONFIG.targetProfitPercent) {
        // Take profit
        try {
          await this.simulator.simulateSell(
            position.tokenId,
            position.symbol,
            position.quantity,
            currentPrice
          );
          logger.info('Take profit exit', {
            symbol: position.symbol,
            pnlPercent: pnlPercent.toFixed(2),
            price: currentPrice,
          });
          this.state.tradesExecuted++;
        } catch (error) {
          logger.warn('Exit failed', { error: error instanceof Error ? error.message : String(error) });
        }
      } else if (pnlPercent <= -CONFIG.stopLossPercent) {
        // Stop loss
        try {
          await this.simulator.simulateSell(
            position.tokenId,
            position.symbol,
            position.quantity,
            currentPrice
          );
          logger.info('Stop loss exit', {
            symbol: position.symbol,
            pnlPercent: pnlPercent.toFixed(2),
            price: currentPrice,
          });
          this.state.tradesExecuted++;
        } catch (error) {
          logger.warn('Exit failed', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }

  /**
   * Generate and save a progress report
   */
  private generateReport(): void {
    const metrics = this.simulator.getMetrics();
    const portfolio = this.simulator.getPortfolioState();
    const elapsedMs = Date.now() - this.state.startTime.getTime();
    const remainingMs = this.state.endTime.getTime() - Date.now();
    
    const report = {
      timestamp: new Date().toISOString(),
      testInfo: {
        startTime: this.state.startTime.toISOString(),
        endTime: this.state.endTime.toISOString(),
        elapsedHours: (elapsedMs / (1000 * 60 * 60)).toFixed(2),
        remainingHours: Math.max(0, remainingMs / (1000 * 60 * 60)).toFixed(2),
        percentComplete: ((elapsedMs / CONFIG.testDurationMs) * 100).toFixed(2),
        status: this.state.status,
      },
      performance: {
        startBalance: metrics.startBalance,
        currentBalance: metrics.currentBalance,
        totalValue: metrics.totalValue,
        unrealizedPnL: metrics.unrealizedPnL,
        realizedPnL: metrics.realizedPnL,
        totalPnL: metrics.totalPnL,
        returnPercent: metrics.returnPercentage.toFixed(2),
        winRate: metrics.winRate.toFixed(2),
        maxDrawdown: metrics.maxDrawdown.toFixed(2),
      },
      activity: {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        openPositions: portfolio.positions.length,
        marketsAnalyzed: this.state.marketsAnalyzed,
        cyclesCompleted: this.state.currentCycle,
      },
      positions: portfolio.positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        pnl: p.pnl,
        pnlPercent: p.pnlPercentage.toFixed(2),
      })),
      errors: this.state.errors.slice(-10), // Last 10 errors
    };

    // Save to file
    const reportPath = path.join(process.cwd(), CONFIG.logFile);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Log summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEEK TEST PROGRESS REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Elapsed: ${report.testInfo.elapsedHours}h / 168h (${report.testInfo.percentComplete}%)`);
    console.log(`💰 Balance: $${metrics.currentBalance.toFixed(2)} (${metrics.returnPercentage >= 0 ? '+' : ''}${metrics.returnPercentage.toFixed(2)}%)`);
    console.log(`📈 Total PnL: $${metrics.totalPnL.toFixed(2)}`);
    console.log(`🎯 Win Rate: ${metrics.winRate.toFixed(1)}%`);
    console.log(`📉 Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
    console.log(`🔄 Trades: ${metrics.totalTrades} (${metrics.winningTrades}W / ${metrics.losingTrades}L)`);
    console.log(`📂 Open Positions: ${portfolio.positions.length}`);
    console.log('='.repeat(60) + '\n');

    this.state.lastReportTime = new Date();
  }

  /**
   * Main test loop - runs one cycle
   */
  private async runCycle(): Promise<void> {
    try {
      this.state.currentCycle++;
      
      // Fetch active markets
      const markets = await this.fetchActiveMarkets();
      this.state.marketsAnalyzed += markets.length;

      if (markets.length === 0) {
        logger.warn('No active markets found');
        return;
      }

      // Check exit signals for existing positions
      await this.checkExitSignals(markets);

      // Analyze markets for new trades
      const portfolio = this.simulator.getPortfolioState();
      const maxNewPositions = 5 - portfolio.positions.length; // Max 5 concurrent positions

      if (maxNewPositions > 0) {
        let newTrades = 0;
        
        for (const market of markets) {
          if (newTrades >= maxNewPositions) break;
          
          // Skip if already have position in this market
          const existingPosition = portfolio.positions.find(
            p => p.tokenId.startsWith(market.conditionId)
          );
          if (existingPosition) continue;

          const analysis = this.analyzeMarket(market);
          
          if (analysis.shouldTrade) {
            await this.executeTrade(market, analysis);
            newTrades++;
          }
        }
      }

      // Generate report if interval passed
      if (Date.now() - this.state.lastReportTime.getTime() >= CONFIG.reportIntervalMs) {
        this.generateReport();
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.state.errors.push(`Cycle ${this.state.currentCycle}: ${errorMsg}`);
      logger.error('Cycle error', { cycle: this.state.currentCycle, error: errorMsg });
    }
  }

  /**
   * Start the 1-week test
   */
  async start(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTING 1-WEEK VIRTUAL TRADING TEST');
    console.log('='.repeat(60));
    console.log(`📅 Start: ${this.state.startTime.toISOString()}`);
    console.log(`📅 End:   ${this.state.endTime.toISOString()}`);
    console.log(`💵 Virtual Balance: $${CONFIG.virtualBalance}`);
    console.log(`⏱️  Check Interval: ${CONFIG.checkIntervalMs / 1000 / 60} minutes`);
    console.log(`📊 Report Interval: ${CONFIG.reportIntervalMs / 1000 / 60} minutes`);
    console.log('='.repeat(60) + '\n');

    logger.info('Week test started', {
      startTime: this.state.startTime.toISOString(),
      endTime: this.state.endTime.toISOString(),
      virtualBalance: CONFIG.virtualBalance,
    });

    // Initial report
    this.generateReport();

    // Main loop
    while (Date.now() < this.state.endTime.getTime() && this.state.status === 'running') {
      await this.runCycle();
      
      // Wait for next interval
      const nextCycleTime = Math.min(
        CONFIG.checkIntervalMs,
        this.state.endTime.getTime() - Date.now()
      );
      
      if (nextCycleTime > 0) {
        await new Promise(resolve => setTimeout(resolve, nextCycleTime));
      }
    }

    // Final report
    this.state.status = 'completed';
    this.generateReport();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 1-WEEK TEST COMPLETED');
    console.log('='.repeat(60));
    
    const finalMetrics = this.simulator.getMetrics();
    console.log(`💰 Final Balance: $${finalMetrics.currentBalance.toFixed(2)}`);
    console.log(`📈 Total Return: ${finalMetrics.returnPercentage.toFixed(2)}%`);
    console.log(`🎯 Final Win Rate: ${finalMetrics.winRate.toFixed(1)}%`);
    console.log(`📉 Max Drawdown: ${finalMetrics.maxDrawdown.toFixed(2)}%`);
    console.log(`🔄 Total Trades: ${finalMetrics.totalTrades}`);
    console.log('='.repeat(60) + '\n');

    logger.info('Week test completed', {
      finalBalance: finalMetrics.currentBalance,
      returnPercent: finalMetrics.returnPercentage,
      winRate: finalMetrics.winRate,
      totalTrades: finalMetrics.totalTrades,
    });
  }

  /**
   * Stop the test early
   */
  stop(): void {
    this.state.status = 'completed';
    logger.info('Week test stopped manually');
  }
}

// Run the test
const test = new WeekTest();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, generating final report...');
  test.stop();
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, generating final report...');
  test.stop();
});

// Start the test
test.start().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
