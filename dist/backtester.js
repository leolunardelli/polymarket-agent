"use strict";
/**
 * Backtesting Framework (P1-HIGH #10)
 *
 * Replays saved market snapshots through a Strategy to evaluate
 * performance without waiting 7 days. Run hundreds of simulated
 * weeks in minutes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backtester = void 0;
const logger_1 = require("./logger");
const trading_simulator_1 = require("./trading-simulator");
// ── Backtester ─────────────────────────────────────────────────────
class Backtester {
    constructor(strategy, config) {
        this.strategy = strategy;
        this.config = config;
    }
    /**
     * Run a backtest over a series of market snapshots.
     * Each entry in `data` represents one cycle's view of the world.
     */
    async run(data) {
        const startMs = Date.now();
        const sim = new trading_simulator_1.TradingSimulator(this.config.initialBalance);
        let totalTrades = 0;
        const returns = [];
        let prevValue = this.config.initialBalance;
        for (const tick of data) {
            // 1. Check exits on current positions
            const portfolio = sim.getPortfolioState();
            for (const pos of portfolio.positions) {
                const [conditionId, outcomeStr] = pos.tokenId.split('_');
                const outcomeIndex = parseInt(outcomeStr) || 0;
                const market = tick.markets.find(m => m.conditionId === conditionId);
                if (!market)
                    continue;
                const currentPrice = market.outcomePrices[outcomeIndex];
                sim.updatePrices([{ tokenId: pos.tokenId, price: currentPrice }]);
                const posView = {
                    ...pos,
                    peakPrice: currentPrice, // simplified – no peak tracking in backtest
                };
                const exit = this.strategy.shouldExit(posView, market);
                if (exit.shouldExit) {
                    const sellQty = Math.max(1, Math.floor(pos.quantity * exit.exitQuantityPercent / 100));
                    try {
                        await sim.simulateSell(pos.tokenId, pos.symbol, sellQty, currentPrice);
                        totalTrades++;
                    }
                    catch { /* skip */ }
                }
            }
            // 2. Look for new entries
            const state = sim.getPortfolioState();
            const openSlots = this.config.maxConcurrentPositions - state.positions.length;
            const minReserve = this.config.initialBalance * (this.config.minCashReservePercent / 100);
            if (openSlots > 0 && state.balance > minReserve) {
                const existing = new Set(state.positions.map(p => p.tokenId.split('_')[0]));
                let filled = 0;
                for (const market of tick.markets) {
                    if (filled >= openSlots)
                        break;
                    if (existing.has(market.conditionId))
                        continue;
                    const signal = this.strategy.analyze(market);
                    if (!signal.shouldTrade)
                        continue;
                    const price = market.outcomePrices[signal.outcomeIndex];
                    const available = Math.max(0, sim.getPortfolioState().balance - minReserve);
                    const spend = Math.min(this.config.maxPositionSize, available * 0.15);
                    const qty = Math.floor(spend / price);
                    if (qty < 1)
                        continue;
                    const tokenId = `${market.conditionId}_${signal.outcomeIndex}`;
                    const symbol = `${market.question.slice(0, 30)}..._${market.outcomes[signal.outcomeIndex]}`;
                    try {
                        await sim.simulateBuy(tokenId, symbol, qty, price);
                        existing.add(market.conditionId);
                        totalTrades++;
                        filled++;
                    }
                    catch { /* skip */ }
                }
            }
            // 3. Track returns for Sharpe
            sim.updatePortfolioHistory();
            const currValue = sim.getPortfolioState().totalValue;
            if (prevValue > 0) {
                returns.push((currValue - prevValue) / prevValue);
            }
            prevValue = currValue;
        }
        const metrics = sim.getMetrics();
        const durationMs = Date.now() - startMs;
        // Sharpe ratio (annualised, assuming 5-min cycles → 105,120/yr)
        const cyclesPerYear = (365 * 24 * 60 * 60 * 1000) / this.config.cycleIntervalMs;
        const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdReturn = returns.length > 1
            ? Math.sqrt(returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1))
            : 0;
        const sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(cyclesPerYear) : 0;
        // Profit factor
        const wins = metrics.winningTrades > 0 ? metrics.averageWin * metrics.winningTrades : 0;
        const losses = metrics.losingTrades > 0 ? Math.abs(metrics.averageLoss) * metrics.losingTrades : 1;
        const profitFactor = losses > 0 ? wins / losses : 0;
        const result = {
            strategyName: this.strategy.name,
            cycles: data.length,
            totalTrades,
            winRate: metrics.winRate,
            returnPercent: metrics.returnPercentage,
            maxDrawdown: metrics.maxDrawdown,
            profitFactor,
            sharpeRatio: Math.round(sharpeRatio * 100) / 100,
            finalBalance: metrics.totalValue,
            durationMs,
        };
        logger_1.logger.info('Backtest complete', result);
        return result;
    }
}
exports.Backtester = Backtester;
//# sourceMappingURL=backtester.js.map