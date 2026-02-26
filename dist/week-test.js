"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const trading_simulator_1 = require("./trading-simulator");
const leaderboard_analyzer_1 = require("./leaderboard-analyzer");
const polymarket_api_1 = require("./polymarket-api");
const sentiment_1 = require("./sentiment");
const trade_logger_1 = require("./trade-logger");
const strategy_1 = require("./strategy");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Configuration - IMPROVED based on 7-day test analysis
const CONFIG = {
    virtualBalance: 10000,
    testDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    checkIntervalMs: 5 * 60 * 1000, // Check markets every 5 minutes
    reportIntervalMs: 5 * 60 * 1000, // Save report every 5 minutes (same as check)
    maxPositionSize: 300, // Max $300 per position (was $500 - too aggressive)
    minProbability: 0.05, // Don't buy below 5%
    maxProbability: 0.97, // Allow high-confidence "safe bets" up to 97%
    safeBetThreshold: 0.90, // Price >= 90% treated as "safe bet" tier
    safeBetMaxPositionSize: 600, // Safe bets get up to $600 (higher because lower return per share)
    targetProfitPercent: 12, // Take profit at 12% gain (was 20% - never triggered)
    stopLossPercent: 8, // Stop loss at 8% loss (was 15% - too much risk)
    maxConcurrentPositions: 12, // More slots = more diverse opportunities (was 8)
    maxLowPricePositions: 3, // Max positions with entry price < 0.10 to avoid long-shot concentration
    lowPriceThreshold: 0.10, // What counts as "low price"
    rebuyCooldownMs: 60 * 60 * 1000, // 1-hour cooldown before re-buying a closed market
    logFile: 'test-results.json',
    // P2 #1: Fetch more markets
    marketFetchLimit: 200,
    // P2 #2: Max positions per category/tag
    maxPositionsPerCategory: 3,
    // NEW: Cash management
    minCashReservePercent: 25, // Keep 25% of starting balance as cash reserve (was 40% — too much idle cash)
    // NEW: Time-based exit
    maxPositionAgeDays: 3, // Close positions older than 3 days if < 5% gain
    maxPositionAgeMinGain: 5, // Min gain % to keep position past age limit
    // NEW: Trailing stop
    trailingStopPercent: 5, // Trailing stop at 5% from peak
    // NEW: Better analysis thresholds
    minConfidence: 30, // Min confidence to trade
    minVolume: 5000, // Min market volume $5k (low bar, scoring handles the rest)
    minLiquidity: 1000, // Min market liquidity $1k
    // NEW: Drawdown circuit breaker
    maxDrawdownPercent: 20, // Stop trading if portfolio drops 20% from peak
    // NEW: Min time-to-expiry
    minDaysToExpiry: 2, // Don't buy markets expiring within 2 days
};
class WeekTest {
    constructor(resume = false) {
        this.marketPriceCache = new Map();
        this.resumedFromSave = false;
        // P1 #2: Markets where top traders are active
        this.smartMoneyMarkets = new Set();
        this.smartMoneyOutcomeByMarket = new Map();
        // P2 #13: Performance snapshots for /api/history
        this.performanceSnapshots = [];
        // P2 #2: Track positions per category
        this.categoryPositionCount = new Map();
        // Track positions that have already taken a partial TP (prevent decay-by-halving)
        this.partialTPTaken = new Set();
        // Track recently closed markets for re-buy cooldown
        this.recentlyClosed = new Map(); // conditionId -> closeTimestamp
        this.analyzer = new leaderboard_analyzer_1.LeaderboardAnalyzer();
        this.api = new polymarket_api_1.PolymarketAPI();
        this.sentimentAnalyzer = new sentiment_1.SentimentAnalyzer();
        this.tradeLogger = new trade_logger_1.TradeLogger();
        this.strategy = (0, strategy_1.createDefaultStrategy)({
            minProbability: CONFIG.minProbability,
            maxProbability: CONFIG.maxProbability,
            safeBetThreshold: CONFIG.safeBetThreshold,
            minVolume: CONFIG.minVolume,
            minLiquidity: CONFIG.minLiquidity,
            minConfidence: CONFIG.minConfidence,
            minDaysToExpiry: CONFIG.minDaysToExpiry,
            targetProfitPercent: CONFIG.targetProfitPercent,
            stopLossPercent: CONFIG.stopLossPercent,
            trailingStopPercent: CONFIG.trailingStopPercent,
            maxPositionAgeDays: CONFIG.maxPositionAgeDays,
            maxPositionAgeMinGain: CONFIG.maxPositionAgeMinGain,
        });
        // Try to load previous state if resuming
        const savedState = resume ? this.loadSavedState() : null;
        if (savedState && resume) {
            // Resume from saved state
            this.simulator = new trading_simulator_1.TradingSimulator(savedState.performance.startBalance);
            this.resumedFromSave = true;
            // Restore simulator state
            this.simulator.restoreState({
                balance: savedState.performance.currentBalance,
                positions: savedState.positions.map((p) => ({
                    tokenId: p.tokenId || (p.symbol.includes('_') ? p.symbol : `unknown_${p.symbol}`),
                    symbol: p.symbol,
                    quantity: p.quantity,
                    entryPrice: p.entryPrice,
                    currentPrice: p.currentPrice,
                    // P2 #6: Restore original createdAt dates
                    createdAt: p.createdAt,
                })),
                realizedPnL: savedState.performance.realizedPnL,
                trades: savedState.activity.totalTrades,
                winningTrades: savedState.activity.winningTrades,
                losingTrades: savedState.activity.losingTrades,
            });
            // P2 #3: Restore peak prices for trailing stop resume
            if (savedState.peakPrices) {
                for (const [key, price] of Object.entries(savedState.peakPrices)) {
                    this.marketPriceCache.set(key, { price: price, timestamp: Date.now() });
                }
            }
            // Restore test state
            this.state = {
                startTime: new Date(savedState.testInfo.startTime),
                endTime: new Date(savedState.testInfo.endTime),
                currentCycle: savedState.activity.cyclesCompleted,
                totalCycles: Math.floor(CONFIG.testDurationMs / CONFIG.checkIntervalMs),
                tradesExecuted: savedState.activity.totalTrades,
                marketsAnalyzed: savedState.activity.marketsAnalyzed,
                lastReportTime: new Date(),
                status: 'running',
                errors: savedState.errors || [],
            };
            console.log('📂 Resumed from saved state');
        }
        else {
            // Fresh start
            this.simulator = new trading_simulator_1.TradingSimulator(CONFIG.virtualBalance);
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
    }
    /**
     * Load saved state from file
     */
    loadSavedState() {
        try {
            const reportPath = path.join(process.cwd(), CONFIG.logFile);
            if (fs.existsSync(reportPath)) {
                const data = fs.readFileSync(reportPath, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            logger_1.logger.warn('Could not load saved state', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return null;
    }
    /**
     * Fetch active markets using the PolymarketAPI class (P0 #1)
     * Gets retry, rate-limiting, caching, and validation for free.
     * P2 #1: Fetches 200 markets sorted by volume DESC.
     */
    async fetchActiveMarkets() {
        try {
            // Fetch a large batch — the API sorts volume as a string (alphabetically)
            // so we fetch many and sort numerically client-side
            const rawMarkets = await this.api.getMarkets({
                closed: false,
                limit: CONFIG.marketFetchLimit,
                active: true,
            });
            const validMarkets = [];
            for (const m of rawMarkets) {
                // Skip malformed entries (API sometimes returns partial objects)
                if (!m.conditionId)
                    continue;
                if (!m.active || m.closed)
                    continue;
                // Parse outcome prices from JSON string array
                const outcomePrices = (m.outcomePrices || []).map((p) => parseFloat(p));
                if (outcomePrices.length < 2 || isNaN(outcomePrices[0]) || outcomePrices[0] <= 0 || outcomePrices[0] >= 1)
                    continue;
                // Filter by probability range EARLY — don't waste enrichment slots
                // on extreme long-shots or near-certainties that the strategy will reject
                if (outcomePrices[0] < CONFIG.minProbability || outcomePrices[0] > CONFIG.maxProbability)
                    continue;
                // Parse token IDs and outcome labels
                const outcomes = m.outcomes || [];
                const tokenIds = m.clobTokenIds || [];
                if (tokenIds.length === 0)
                    continue; // Need tokens for trading
                const volume = m.volumeNum ?? m.volume ?? 0;
                const liquidity = m.liquidityNum ?? m.liquidity ?? 0;
                if (volume < 1000)
                    continue; // Lower threshold — sort client-side
                // Filter out already-expired markets (API sometimes returns them despite active=true)
                const endDate = m.endDateIso || m.endDate || '';
                if (endDate) {
                    const daysToExpiry = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    if (daysToExpiry < 0)
                        continue;
                }
                validMarkets.push({
                    conditionId: m.conditionId,
                    questionId: m.questionID || m.conditionId,
                    question: m.question || 'Unknown',
                    outcomes,
                    outcomePrices,
                    volume,
                    liquidity,
                    endDate: m.endDateIso || m.endDate || '',
                    tokenIds,
                });
            }
            // Sort by volume descending (the API can't sort numerically)
            validMarkets.sort((a, b) => b.volume - a.volume);
            // Keep top markets — enough to find diverse opportunities
            const topMarkets = validMarkets.slice(0, 100);
            logger_1.logger.info('Fetched active markets via PolymarketAPI', {
                raw: rawMarkets.length,
                valid: validMarkets.length,
                top: topMarkets.length,
                topVolume: topMarkets[0]?.volume,
            });
            return topMarkets;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch markets', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
    /**
     * P0 #2: Enrich a market with price history momentum.
     * Returns % change over the last 24 hours.
     */
    async enrichMomentum(market) {
        try {
            if (!market.tokenIds || market.tokenIds.length === 0)
                return;
            const tokenId = market.tokenIds[0]; // Yes token
            const now = Math.floor(Date.now() / 1000);
            const history = await this.api.getPriceHistory(tokenId, {
                startTs: now - 86400, // 24 h ago
                endTs: now,
                interval: 'hour',
                market: market.conditionId, // conditionId required by CLOB prices-history
            });
            if (history.length >= 2) {
                const oldest = history[0].price;
                const newest = history[history.length - 1].price;
                market.momentum = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
            }
        }
        catch {
            // Non-critical — leave momentum undefined
        }
    }
    /**
     * P0 #3: Enrich a market with orderbook spread.
     * Sets spread as a percentage of the mid-price.
     */
    async enrichSpread(market) {
        try {
            if (!market.tokenIds || market.tokenIds.length === 0)
                return;
            const tokenId = market.tokenIds[0];
            const book = await this.api.getOrderbook(tokenId);
            if (book.bids.length > 0 && book.asks.length > 0) {
                // Find the HIGHEST bid and LOWEST ask (API sort order not guaranteed)
                const bestBid = Math.max(...book.bids.map(b => parseFloat(b.price)));
                const bestAsk = Math.min(...book.asks.map(a => parseFloat(a.price)));
                // Use ABSOLUTE spread as percentage of the 0-1 price range
                if (bestBid > 0 && bestAsk > bestBid) {
                    market.spread = (bestAsk - bestBid) * 100; // e.g. 0.55-0.45 = 10%
                }
            }
        }
        catch {
            // Non-critical
        }
    }
    /**
     * P1 #1: Enrich a market with sentiment score from its question text.
     */
    enrichSentiment(market) {
        const result = this.sentimentAnalyzer.analyzeSentiment(market.question);
        market.sentimentScore = result.score;
    }
    /**
     * P1 #2: Refresh smart-money market set from leaderboard data.
     * Called periodically (every ~6 hours = 72 cycles).
     */
    async refreshSmartMoney() {
        try {
            const signals = await this.analyzer.getSmartMoneySignals('week', 30);
            this.smartMoneyMarkets = signals.marketSet;
            this.smartMoneyOutcomeByMarket = signals.preferredOutcome;
            logger_1.logger.info('Smart money data refreshed', {
                selectedTraders: signals.selectedTraders,
                smartMoneyMarkets: signals.marketSet.size,
            });
        }
        catch (error) {
            logger_1.logger.warn('Smart money refresh failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * P2 #2: Fetch tags for categorisation filtering.
     */
    async enrichTags(market) {
        // Use the question text heuristic for category tagging
        const q = market.question.toLowerCase();
        const tags = [];
        if (/election|president|vote|democrat|republican|congress|senate/i.test(q))
            tags.push('politics');
        if (/nfl|nba|mlb|nhl|soccer|football|basketball|tennis|sports/i.test(q))
            tags.push('sports');
        if (/bitcoin|ethereum|crypto|btc|eth|token|blockchain/i.test(q))
            tags.push('crypto');
        if (/gdp|inflation|fed|interest rate|cpi|recession|economy/i.test(q))
            tags.push('economics');
        if (/ai|artificial intelligence|openai|gpt|technology|tech/i.test(q))
            tags.push('tech');
        if (tags.length === 0)
            tags.push('other');
        market.tags = tags;
    }
    /**
     * Analyze a market via the pluggable Strategy (P1 #11).
     * The strategy receives the enriched MarketSnapshot.
     */
    analyzeMarket(market) {
        // Build a MarketSnapshot with enrichment fields
        const snapshot = {
            conditionId: market.conditionId,
            questionId: market.questionId,
            question: market.question,
            outcomes: market.outcomes,
            outcomePrices: market.outcomePrices,
            volume: market.volume,
            liquidity: market.liquidity,
            endDate: market.endDate,
            momentum: market.momentum,
            spread: market.spread,
            sentimentScore: market.sentimentScore,
            smartMoneyActive: market.smartMoneyActive,
            smartMoneyOutcomeIndex: market.smartMoneyOutcomeIndex,
            tags: market.tags,
        };
        return this.strategy.analyze(snapshot);
    }
    /**
     * Execute a trade based on analysis
     * IMPROVED: Cash reserve, Kelly sizing, SELL support, trade logging (P2 #15)
     */
    async executeTrade(market, analysis) {
        const price = market.outcomePrices[analysis.outcomeIndex];
        const portfolio = this.simulator.getPortfolioState();
        // IMPROVEMENT: Enforce minimum cash reserve (40% of starting balance)
        const minCashReserve = CONFIG.virtualBalance * (CONFIG.minCashReservePercent / 100);
        const availableForTrading = Math.max(0, portfolio.balance - minCashReserve);
        if (availableForTrading <= 0) {
            logger_1.logger.debug('Cash reserve limit reached, skipping trade', {
                balance: portfolio.balance,
                minReserve: minCashReserve,
            });
            return;
        }
        // P2 #2: Category limit enforcement
        const primaryTag = (market.tags && market.tags[0]) || 'other';
        const categoryCount = this.categoryPositionCount.get(primaryTag) || 0;
        if (categoryCount >= CONFIG.maxPositionsPerCategory) {
            logger_1.logger.debug('Category limit reached', { tag: primaryTag, count: categoryCount });
            return;
        }
        // Scale position size — safe bets get bigger positions (lower return per share, so more shares)
        const isSafeBet = price >= CONFIG.safeBetThreshold;
        const maxPositionForTier = isSafeBet ? CONFIG.safeBetMaxPositionSize : CONFIG.maxPositionSize;
        const capitalPercent = isSafeBet ? 0.25 : 0.15; // safe bets can use 25% of available capital
        const confidenceFactor = Math.min(analysis.confidence / 100, 1);
        const maxSpend = Math.min(maxPositionForTier, availableForTrading * capitalPercent, availableForTrading * confidenceFactor * (isSafeBet ? 0.35 : 0.2));
        const quantity = Math.floor(maxSpend / price);
        if (quantity < 1) {
            return;
        }
        try {
            const tokenId = `${market.conditionId}_${analysis.outcomeIndex}`;
            const symbol = `${market.question.slice(0, 30)}..._${market.outcomes[analysis.outcomeIndex]}`;
            // P1 #3: Support both BUY and SELL signals
            if (analysis.side === 'BUY') {
                await this.simulator.simulateBuy(tokenId, symbol, quantity, price);
            }
            else {
                // For a SELL signal on a new market, we buy the opposite outcome
                const oppositeIdx = analysis.outcomeIndex === 0 ? 1 : 0;
                const oppositePrice = market.outcomePrices[oppositeIdx];
                const oppositeTokenId = `${market.conditionId}_${oppositeIdx}`;
                const oppositeSymbol = `${market.question.slice(0, 30)}..._${market.outcomes[oppositeIdx]}`;
                const oppQty = Math.floor(maxSpend / oppositePrice);
                if (oppQty < 1)
                    return;
                await this.simulator.simulateBuy(oppositeTokenId, oppositeSymbol, oppQty, oppositePrice);
            }
            this.state.tradesExecuted++;
            this.marketPriceCache.set(tokenId, { price, timestamp: Date.now() });
            this.categoryPositionCount.set(primaryTag, categoryCount + 1);
            // P2 #15: Persistent trade log
            this.tradeLogger.log({
                id: `trade_${Date.now()}`,
                timestamp: new Date().toISOString(),
                tokenId,
                symbol,
                side: analysis.side,
                quantity,
                price,
                totalValue: quantity * price,
                fees: quantity * price * 0.015,
                reason: analysis.reason,
                confidence: analysis.confidence,
                portfolioValueAfter: this.simulator.getPortfolioState().totalValue,
            });
            console.log(`Trade executed: ${analysis.side} ${symbol}`);
            logger_1.logger.info('Virtual trade executed', {
                side: analysis.side,
                market: market.question.slice(0, 50),
                outcome: market.outcomes[analysis.outcomeIndex],
                quantity,
                price,
                totalValue: quantity * price,
                reason: analysis.reason,
                confidence: analysis.confidence,
            });
        }
        catch (error) {
            logger_1.logger.warn('Trade failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Check existing positions for exit signals.
     * P1 #4: Supports partial exits (scale-out) via strategy.shouldExit().
     * Uses the Strategy abstraction for exit decisions.
     */
    async checkExitSignals(markets) {
        const portfolio = this.simulator.getPortfolioState();
        for (const position of portfolio.positions) {
            // Parse tokenId to get market info
            const [conditionId, outcomeIndexStr] = position.tokenId.split('_');
            const outcomeIndex = parseInt(outcomeIndexStr) || 0;
            // Find current market price
            const market = markets.find(m => m.conditionId === conditionId);
            if (!market)
                continue;
            const currentPrice = market.outcomePrices[outcomeIndex];
            // Update position price
            this.simulator.updatePrices([{ tokenId: position.tokenId, price: currentPrice }]);
            // Track peak price for trailing stop (P2 #3: saved/restored in report)
            const peakKey = `peak_${position.tokenId}`;
            const cachedPeak = this.marketPriceCache.get(peakKey);
            const peakPrice = cachedPeak ? Math.max(cachedPeak.price, currentPrice) : currentPrice;
            this.marketPriceCache.set(peakKey, { price: peakPrice, timestamp: Date.now() });
            // Build snapshot for the strategy
            const snapshot = {
                conditionId: market.conditionId,
                questionId: market.questionId,
                question: market.question,
                outcomes: market.outcomes,
                outcomePrices: market.outcomePrices,
                volume: market.volume,
                liquidity: market.liquidity,
                endDate: market.endDate,
                momentum: market.momentum,
                spread: market.spread,
                sentimentScore: market.sentimentScore,
                smartMoneyActive: market.smartMoneyActive,
                tags: market.tags,
            };
            const exitSignal = this.strategy.shouldExit({ ...position, peakPrice }, snapshot);
            if (exitSignal.shouldExit) {
                // FIX: Prevent partial-TP decay — if this position already partial-exited,
                // skip further partial exits (only allow full exit signals through)
                if (exitSignal.exitQuantityPercent < 100 && this.partialTPTaken.has(position.tokenId)) {
                    continue; // Already partial-exited once, wait for full TP/SL/trailing
                }
                try {
                    // P1 #4: Partial exit support — sell only exitQuantityPercent
                    const sellQty = Math.max(1, Math.floor(position.quantity * exitSignal.exitQuantityPercent / 100));
                    await this.simulator.simulateSell(position.tokenId, position.symbol, sellQty, currentPrice);
                    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
                    // P2 #15: Log exit trade
                    this.tradeLogger.log({
                        id: `exit_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        tokenId: position.tokenId,
                        symbol: position.symbol,
                        side: 'SELL',
                        quantity: sellQty,
                        price: currentPrice,
                        totalValue: sellQty * currentPrice,
                        fees: sellQty * currentPrice * 0.015,
                        reason: exitSignal.reason,
                        pnl: (currentPrice - position.entryPrice) * sellQty,
                        portfolioValueAfter: this.simulator.getPortfolioState().totalValue,
                    });
                    logger_1.logger.info('Position closed', {
                        symbol: position.symbol,
                        reason: exitSignal.reason,
                        exitPercent: exitSignal.exitQuantityPercent,
                        soldQty: sellQty,
                        pnlPercent: pnlPercent.toFixed(2),
                        price: currentPrice,
                    });
                    this.state.tradesExecuted++;
                    // Track partial TP to prevent repeated halving
                    if (exitSignal.exitQuantityPercent < 100) {
                        this.partialTPTaken.add(position.tokenId);
                    }
                    // Update category count and cooldown if fully closed
                    if (sellQty >= position.quantity) {
                        const tag = market.tags?.[0] || 'other';
                        const count = this.categoryPositionCount.get(tag) || 0;
                        if (count > 0)
                            this.categoryPositionCount.set(tag, count - 1);
                        // Mark this market on cooldown so we don't immediately re-buy
                        this.recentlyClosed.set(conditionId, Date.now());
                        // Clean up partial TP tracker
                        this.partialTPTaken.delete(position.tokenId);
                    }
                }
                catch (error) {
                    logger_1.logger.warn('Exit failed', { error: error instanceof Error ? error.message : String(error) });
                }
            }
        }
    }
    /**
     * Generate and save a progress report
     * P3 #1: Includes Sharpe ratio + profit factor
     * P2 #3: Saves peak prices for resume
     * P2 #6: Saves position createdAt dates
     * P2 #13: Includes portfolioHistory for dashboard /api/history
     */
    generateReport() {
        // IMPROVEMENT: Update portfolio history every cycle for accurate drawdown tracking
        this.simulator.updatePortfolioHistory();
        const metrics = this.simulator.getMetrics();
        const portfolio = this.simulator.getPortfolioState();
        const elapsedMs = Date.now() - this.state.startTime.getTime();
        const remainingMs = this.state.endTime.getTime() - Date.now();
        // P2 #13: Snapshot for /api/history
        this.performanceSnapshots.push({
            timestamp: new Date().toISOString(),
            totalValue: portfolio.totalValue,
            balance: portfolio.balance,
        });
        // Keep last 2000 snapshots
        if (this.performanceSnapshots.length > 2000) {
            this.performanceSnapshots = this.performanceSnapshots.slice(-1000);
        }
        // P2 #3: Serialize peak prices for resume
        const peakPrices = {};
        for (const [key, val] of this.marketPriceCache) {
            if (key.startsWith('peak_')) {
                peakPrices[key] = val.price;
            }
        }
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
                // P3 #1 + P2 #5: New metrics
                sharpeRatio: metrics.sharpeRatio,
                profitFactor: metrics.profitFactor,
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
                tokenId: p.tokenId,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                currentPrice: p.currentPrice,
                pnl: p.pnl,
                pnlPercent: p.pnlPercentage.toFixed(2),
                // P2 #6: Save createdAt for restore
                createdAt: p.createdAt.toISOString(),
            })),
            // P2 #3: Peak prices for trailing-stop resume
            peakPrices,
            // P2 #13: Performance snapshots for dashboard history
            performanceSnapshots: this.performanceSnapshots.slice(-200),
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
        console.log(`� Sharpe: ${metrics.sharpeRatio} | PF: ${metrics.profitFactor}`);
        console.log(`�🔄 Trades: ${metrics.totalTrades} (${metrics.winningTrades}W / ${metrics.losingTrades}L)`);
        console.log(`📂 Open Positions: ${portfolio.positions.length}`);
        console.log('='.repeat(60) + '\n');
        this.state.lastReportTime = new Date();
    }
    /**
     * Main test loop - runs one cycle
     * IMPROVED: Enrichment pipeline, drawdown breaker, category limits
     */
    async runCycle() {
        try {
            this.state.currentCycle++;
            // P1 #2: Refresh smart money data periodically (every ~6 hours = 72 cycles)
            if (this.state.currentCycle % 72 === 1) {
                await this.refreshSmartMoney();
            }
            // Fetch active markets (P0 #1: via PolymarketAPI, P2 #1: 200 markets)
            const markets = await this.fetchActiveMarkets();
            this.state.marketsAnalyzed += markets.length;
            if (markets.length === 0) {
                logger_1.logger.warn('No active markets found');
                return;
            }
            // ── Enrichment pipeline ───────────────────────────────────
            // Enrich top candidates only (sorted by volume desc already)
            const toEnrich = markets.slice(0, 30); // top 30 by volume
            for (const m of toEnrich) {
                // P0 #2: Momentum, P0 #3: Spread, P1 #1: Sentiment, P2 #2: Tags
                await Promise.all([
                    this.enrichMomentum(m),
                    this.enrichSpread(m),
                ]);
                this.enrichSentiment(m);
                await this.enrichTags(m);
                // P1 #2: Smart money flag
                m.smartMoneyActive = this.smartMoneyMarkets.has(m.conditionId);
                m.smartMoneyOutcomeIndex = this.smartMoneyOutcomeByMarket.get(m.conditionId);
            }
            // Log enrichment summary for top 5 candidates
            for (const m of toEnrich.slice(0, 5)) {
                logger_1.logger.info('Enriched market', {
                    q: m.question.slice(0, 40),
                    price: m.outcomePrices[0],
                    vol: m.volume,
                    liq: m.liquidity,
                    momentum: m.momentum,
                    spread: m.spread,
                    sentiment: m.sentimentScore,
                });
            }
            // ALWAYS check exits first (most important for realizing P&L)
            await this.checkExitSignals(markets);
            // IMPROVEMENT: Drawdown circuit breaker
            const portfolioState = this.simulator.getPortfolioState();
            const currentDrawdown = ((CONFIG.virtualBalance - portfolioState.totalValue) / CONFIG.virtualBalance) * 100;
            if (currentDrawdown >= CONFIG.maxDrawdownPercent) {
                logger_1.logger.warn('CIRCUIT BREAKER: Max drawdown reached, no new trades', {
                    drawdown: currentDrawdown.toFixed(2),
                    limit: CONFIG.maxDrawdownPercent,
                });
                // Still generate report but don't open new positions
                this.generateReport();
                return;
            }
            // Analyze markets for new trades
            const portfolio = this.simulator.getPortfolioState();
            const maxNewPositions = CONFIG.maxConcurrentPositions - portfolio.positions.length;
            // IMPROVEMENT: Also check cash reserve before trying new trades
            const minCashReserve = CONFIG.virtualBalance * (CONFIG.minCashReservePercent / 100);
            const hasCashForTrading = portfolio.balance > minCashReserve;
            logger_1.logger.info('Trade gate check', {
                maxNewPositions,
                hasCashForTrading,
                balance: portfolio.balance,
                minCashReserve,
                openPositions: portfolio.positions.length,
                toEnrichCount: toEnrich.length,
            });
            if (maxNewPositions > 0 && hasCashForTrading) {
                let newTrades = 0;
                let rejected = 0;
                // Build a set of ALL conditionIds in portfolio
                const existingConditionIds = new Set(portfolio.positions.map(p => p.tokenId.split('_')[0]));
                // Count existing low-price positions for concentration limit
                const lowPriceCount = portfolio.positions.filter(p => p.entryPrice < CONFIG.lowPriceThreshold).length;
                for (const market of toEnrich) {
                    if (newTrades >= maxNewPositions)
                        break;
                    // Duplicate check
                    if (existingConditionIds.has(market.conditionId))
                        continue;
                    // Re-buy cooldown — don't re-enter a market within 1 hour of closing
                    const closedAt = this.recentlyClosed.get(market.conditionId);
                    if (closedAt && (Date.now() - closedAt) < CONFIG.rebuyCooldownMs) {
                        continue;
                    }
                    // Low-price concentration limit
                    const marketPrice = market.outcomePrices[0];
                    if (marketPrice < CONFIG.lowPriceThreshold && lowPriceCount >= CONFIG.maxLowPricePositions) {
                        continue;
                    }
                    const analysis = this.analyzeMarket(market);
                    if (analysis.shouldTrade) {
                        await this.executeTrade(market, analysis);
                        existingConditionIds.add(market.conditionId);
                        newTrades++;
                        logger_1.logger.info('Trade executed', {
                            question: market.question.slice(0, 50),
                            side: analysis.side,
                            confidence: analysis.confidence.toFixed(1),
                            price: market.outcomePrices[0],
                        });
                    }
                    else {
                        rejected++;
                        // Log ALL rejections at INFO level (first 10 only to avoid spam)
                        if (rejected <= 10) {
                            logger_1.logger.info('Market rejected', {
                                question: market.question.slice(0, 50),
                                price: market.outcomePrices[0],
                                confidence: analysis.confidence.toFixed(1),
                                reason: analysis.reason,
                                volume: market.volume,
                                momentum: market.momentum,
                                spread: market.spread,
                            });
                        }
                    }
                }
                logger_1.logger.info('Cycle trade summary', { newTrades, rejected, analyzed: toEnrich.length });
            }
            else if (!hasCashForTrading) {
                logger_1.logger.info('Cash reserve limit reached, waiting for exits', {
                    balance: portfolio.balance,
                    minReserve: minCashReserve,
                });
            }
            // Always save report after each cycle
            this.generateReport();
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.state.errors.push(`Cycle ${this.state.currentCycle}: ${errorMsg}`);
            logger_1.logger.error('Cycle error', { cycle: this.state.currentCycle, error: errorMsg });
        }
    }
    /**
     * Start the 1-week test
     */
    async start() {
        console.log('\n' + '='.repeat(60));
        if (this.resumedFromSave) {
            console.log('🔄 RESUMING 1-WEEK VIRTUAL TRADING TEST');
        }
        else {
            console.log('🚀 STARTING 1-WEEK VIRTUAL TRADING TEST');
        }
        console.log('='.repeat(60));
        console.log(`📅 Start: ${this.state.startTime.toISOString()}`);
        console.log(`📅 End:   ${this.state.endTime.toISOString()}`);
        const remainingMs = this.state.endTime.getTime() - Date.now();
        const remainingHours = Math.max(0, remainingMs / (1000 * 60 * 60)).toFixed(2);
        console.log(`⏱️  Remaining: ${remainingHours} hours`);
        const portfolio = this.simulator.getPortfolioState();
        console.log(`💵 Current Balance: $${portfolio.balance.toFixed(2)}`);
        console.log(`📂 Open Positions: ${portfolio.positions.length}`);
        console.log(`🔄 Cycles Completed: ${this.state.currentCycle}`);
        console.log(`⏱️  Check Interval: ${CONFIG.checkIntervalMs / 1000 / 60} minutes`);
        console.log(`📊 Report Interval: ${CONFIG.reportIntervalMs / 1000 / 60} minutes`);
        console.log('='.repeat(60) + '\n');
        logger_1.logger.info('Week test started', {
            resumed: this.resumedFromSave,
            startTime: this.state.startTime.toISOString(),
            endTime: this.state.endTime.toISOString(),
            remainingHours,
            currentBalance: portfolio.balance,
            openPositions: portfolio.positions.length,
        });
        // Initial report
        this.generateReport();
        // Main loop
        while (Date.now() < this.state.endTime.getTime() && this.state.status === 'running') {
            await this.runCycle();
            // Wait for next interval
            const nextCycleTime = Math.min(CONFIG.checkIntervalMs, this.state.endTime.getTime() - Date.now());
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
        console.log(`� Sharpe: ${finalMetrics.sharpeRatio} | Profit Factor: ${finalMetrics.profitFactor}`);
        console.log(`🔄 Total Trades: ${finalMetrics.totalTrades}`);
        console.log(`📝 Trade Log: ${this.tradeLogger.count()} entries saved to trades.jsonl`);
        console.log('='.repeat(60) + '\n');
        logger_1.logger.info('Week test completed', {
            finalBalance: finalMetrics.currentBalance,
            returnPercent: finalMetrics.returnPercentage,
            winRate: finalMetrics.winRate,
            totalTrades: finalMetrics.totalTrades,
        });
    }
    /**
     * Stop the test early
     */
    stop() {
        this.state.status = 'completed';
        logger_1.logger.info('Week test stopped manually');
    }
}
// Check for --resume flag
const shouldResume = process.argv.includes('--resume');
// Run the test
const test = new WeekTest(shouldResume);
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
//# sourceMappingURL=week-test.js.map