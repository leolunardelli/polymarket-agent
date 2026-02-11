"use strict";
/**
 * Trading Simulator Module
 * Simulates trades using virtual tokens for testing purposes
 * Tracks virtual balance, positions, and generates fake execution reports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingSimulator = void 0;
const logger_1 = require("./logger");
class TradingSimulator {
    constructor(initialBalance = 10000) {
        this.positions = new Map();
        this.trades = [];
        this.realizedPnLHistory = [];
        this.portfolioValueHistory = [];
        if (initialBalance <= 0) {
            throw new Error('Initial balance must be positive');
        }
        this.balance = initialBalance;
        this.initialBalance = initialBalance;
        logger_1.logger.info('TradingSimulator initialized', { initialBalance });
    }
    /**
     * Validate trade parameters
     */
    validateTradeParams(tokenId, symbol, quantity, price) {
        if (!tokenId || typeof tokenId !== 'string') {
            throw new Error('tokenId must be a non-empty string');
        }
        if (!symbol || typeof symbol !== 'string') {
            throw new Error('symbol must be a non-empty string');
        }
        if (typeof quantity !== 'number' || quantity <= 0 || !Number.isFinite(quantity)) {
            throw new Error('quantity must be a positive finite number');
        }
        if (typeof price !== 'number' || price <= 0 || !Number.isFinite(price)) {
            throw new Error('price must be a positive finite number');
        }
    }
    /**
     * Simulate a BUY order with virtual tokens
     */
    async simulateBuy(tokenId, symbol, quantity, price) {
        // Input validation
        this.validateTradeParams(tokenId, symbol, quantity, price);
        const totalValue = quantity * price;
        // P1 #5: Slippage simulation — 0.1% base + impact based on order size
        const slippagePct = 0.001 + (totalValue / 50000) * 0.05; // bigger orders = more slippage
        const slippageAmount = totalValue * slippagePct;
        // P1 #6: Realistic taker fee (1.5%) — virtual traders are always takers
        const fees = totalValue * 0.015;
        const totalCost = totalValue + fees + slippageAmount;
        if (this.balance < totalCost) {
            logger_1.logger.warn('Insufficient virtual balance for buy order', {
                required: totalCost,
                available: this.balance,
            });
            throw new Error(`Insufficient balance: ${this.balance} < ${totalCost}`);
        }
        // Deduct from balance
        this.balance -= totalCost;
        // Create or update position
        const existingPosition = this.positions.get(tokenId);
        const newPosition = {
            tokenId,
            symbol,
            quantity: (existingPosition?.quantity || 0) + quantity,
            entryPrice: existingPosition
                ? (existingPosition.entryPrice * existingPosition.quantity +
                    price * quantity) /
                    ((existingPosition?.quantity || 0) + quantity)
                : price,
            currentPrice: price,
            pnl: 0,
            pnlPercentage: 0,
            createdAt: existingPosition?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        this.positions.set(tokenId, newPosition);
        // Create trade record
        const trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            tokenId,
            symbol,
            side: 'BUY',
            quantity,
            price,
            totalValue,
            fees,
            executedAt: new Date(),
            status: 'executed',
            virtualMode: true,
        };
        this.trades.push(trade);
        this.updatePortfolioHistory();
        logger_1.logger.info('Virtual buy executed', {
            symbol,
            quantity,
            price,
            totalCost,
            remainingBalance: this.balance,
        });
        return trade;
    }
    /**
     * Simulate a SELL order with virtual tokens
     */
    async simulateSell(tokenId, symbol, quantity, price) {
        // Input validation
        this.validateTradeParams(tokenId, symbol, quantity, price);
        const position = this.positions.get(tokenId);
        if (!position || position.quantity < quantity) {
            logger_1.logger.warn('Insufficient position for sell order', {
                symbol,
                required: quantity,
                available: position?.quantity || 0,
            });
            throw new Error(`Insufficient position: ${position?.quantity || 0} < ${quantity}`);
        }
        const totalValue = quantity * price;
        // P1 #5: Slippage simulation — 0.1% base + impact based on order size
        const slippagePct = 0.001 + (totalValue / 50000) * 0.05;
        const slippageAmount = totalValue * slippagePct;
        // P1 #6: Realistic taker fee (1.5%)
        const fees = totalValue * 0.015;
        const netProceeds = totalValue - fees - slippageAmount;
        // Add to balance
        this.balance += netProceeds;
        // Calculate PnL
        const costBasis = quantity * position.entryPrice;
        const pnl = netProceeds - costBasis;
        // Update or remove position
        if (position.quantity === quantity) {
            this.positions.delete(tokenId);
        }
        else {
            position.quantity -= quantity;
            position.updatedAt = new Date();
            this.positions.set(tokenId, position);
        }
        // Track realized PnL
        this.realizedPnLHistory.push(pnl);
        // Create trade record
        const trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            tokenId,
            symbol,
            side: 'SELL',
            quantity,
            price,
            totalValue,
            fees,
            executedAt: new Date(),
            status: 'executed',
            virtualMode: true,
        };
        this.trades.push(trade);
        this.updatePortfolioHistory();
        logger_1.logger.info('Virtual sell executed', {
            symbol,
            quantity,
            price,
            netProceeds,
            realizedPnL: pnl,
            remainingBalance: this.balance,
        });
        return trade;
    }
    /**
     * Update prices for all open positions (simulates market movement)
     */
    updatePrices(priceUpdates) {
        let totalUnrealizedPnL = 0;
        for (const update of priceUpdates) {
            const position = this.positions.get(update.tokenId);
            if (position) {
                position.currentPrice = update.price;
                position.pnl =
                    (update.price - position.entryPrice) * position.quantity;
                position.pnlPercentage =
                    ((update.price - position.entryPrice) / position.entryPrice) * 100;
                position.updatedAt = new Date();
                this.positions.set(update.tokenId, position);
                totalUnrealizedPnL += position.pnl;
            }
        }
        logger_1.logger.debug('Prices updated', {
            positions: this.positions.size,
            unrealizedPnL: totalUnrealizedPnL,
        });
    }
    /**
     * Get current portfolio state
     */
    getPortfolioState() {
        const positions = Array.from(this.positions.values());
        const unrealizedPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
        const totalPositionsValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalValue = this.balance + totalPositionsValue;
        return {
            balance: this.balance,
            positions,
            totalValue,
            unrealizedPnL,
        };
    }
    /**
     * Get complete trading metrics
     */
    getMetrics() {
        const portfolio = this.getPortfolioState();
        const realizedPnL = this.realizedPnLHistory.reduce((a, b) => a + b, 0);
        const totalPnL = portfolio.unrealizedPnL + realizedPnL;
        // Correctly count winning trades from realizedPnLHistory
        const wins = this.realizedPnLHistory.filter(pnl => pnl > 0);
        const losses = this.realizedPnLHistory.filter(pnl => pnl < 0);
        const totalClosedTrades = this.realizedPnLHistory.length;
        // Win rate = winning trades / total closed trades (SELLS that closed positions)
        const winRate = totalClosedTrades > 0
            ? (wins.length / totalClosedTrades) * 100
            : 0;
        return {
            startBalance: this.initialBalance,
            currentBalance: this.balance,
            totalValue: portfolio.totalValue,
            unrealizedPnL: portfolio.unrealizedPnL,
            realizedPnL,
            totalPnL,
            winRate: Math.round(winRate * 100) / 100,
            totalTrades: this.trades.length,
            winningTrades: wins.length,
            losingTrades: losses.length,
            averageWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
            averageLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
            largestWin: wins.length > 0 ? Math.max(...wins) : 0,
            largestLoss: losses.length > 0 ? Math.min(...losses) : 0,
            maxDrawdown: this.calculateMaxDrawdown(),
            returnPercentage: ((portfolio.totalValue - this.initialBalance) / this.initialBalance) *
                100,
            // P2 #5: Profit factor
            profitFactor: this.calculateProfitFactor(wins, losses),
            // P3 #1: Sharpe ratio (annualised from 5-min cycles)
            sharpeRatio: this.calculateSharpeRatio(),
        };
    }
    /**
     * P2 #5: Profit factor = gross wins / gross losses
     */
    calculateProfitFactor(wins, losses) {
        const grossWins = wins.reduce((a, b) => a + b, 0);
        const grossLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
        return grossLosses > 0 ? Math.round((grossWins / grossLosses) * 100) / 100 : grossWins > 0 ? Infinity : 0;
    }
    /**
     * P3 #1: Sharpe ratio from portfolio value history
     * Annualised assuming 5-min cycles (105,120 cycles/year)
     */
    calculateSharpeRatio() {
        if (this.portfolioValueHistory.length < 3)
            return 0;
        const returns = [];
        for (let i = 1; i < this.portfolioValueHistory.length; i++) {
            const prev = this.portfolioValueHistory[i - 1].value;
            if (prev > 0) {
                returns.push((this.portfolioValueHistory[i].value - prev) / prev);
            }
        }
        if (returns.length < 2)
            return 0;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
        const std = Math.sqrt(variance);
        if (std === 0)
            return 0;
        const cyclesPerYear = 105120;
        return Math.round((mean / std) * Math.sqrt(cyclesPerYear) * 100) / 100;
    }
    /**
     * Calculate maximum drawdown from TOTAL PORTFOLIO VALUE (not just cash)
     */
    calculateMaxDrawdown() {
        if (this.portfolioValueHistory.length < 2)
            return 0;
        let maxDrawdown = 0;
        let peak = this.portfolioValueHistory[0].value;
        for (const entry of this.portfolioValueHistory) {
            if (entry.value > peak) {
                peak = entry.value;
            }
            const drawdown = ((peak - entry.value) / peak) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        return Math.round(maxDrawdown * 100) / 100;
    }
    /**
     * Record portfolio value to history (includes positions value)
     * Can be called externally to track value between trades
     */
    updatePortfolioHistory() {
        const portfolio = this.getPortfolioState();
        this.portfolioValueHistory.push({
            timestamp: new Date(),
            value: portfolio.totalValue,
        });
        // P2 #4: Prune history to prevent unbounded growth
        if (this.portfolioValueHistory.length > 2000) {
            this.portfolioValueHistory = this.portfolioValueHistory.slice(-1000);
        }
    }
    /**
     * Get all trades
     */
    getTrades() {
        return [...this.trades];
    }
    /**
     * Reset simulation
     */
    reset() {
        this.balance = this.initialBalance;
        this.positions.clear();
        this.trades = [];
        this.realizedPnLHistory = [];
        this.portfolioValueHistory = [];
        logger_1.logger.info('Trading simulator reset');
    }
    /**
     * Get trades by side
     */
    getTradesByType(side) {
        return this.trades.filter(t => t.side === side);
    }
    /**
     * Restore simulator state from saved data (for resume functionality)
     */
    restoreState(state) {
        this.balance = state.balance;
        // Restore positions
        this.positions.clear();
        for (const pos of state.positions) {
            // Calculate PnL from prices if not provided
            const costBasis = pos.quantity * pos.entryPrice;
            const currentValue = pos.quantity * pos.currentPrice;
            const calculatedPnL = currentValue - costBasis;
            const calculatedPnLPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
            const position = {
                tokenId: pos.tokenId || pos.symbol,
                symbol: pos.symbol,
                quantity: pos.quantity,
                entryPrice: pos.entryPrice,
                currentPrice: pos.currentPrice,
                pnl: pos.pnl ?? calculatedPnL,
                pnlPercentage: pos.pnlPercentage ?? (parseFloat(pos.pnlPercent || '0') || calculatedPnLPercent),
                // P2 #6: Restore original createdAt so time-based exits work after resume
                createdAt: pos.createdAt ? new Date(pos.createdAt) : new Date(),
                updatedAt: new Date(),
            };
            this.positions.set(position.tokenId, position);
        }
        // Restore trades if available
        if (state.trades && Array.isArray(state.trades)) {
            this.trades = state.trades;
        }
        // Restore realized PnL history
        if (state.realizedPnL !== undefined) {
            this.realizedPnLHistory = [state.realizedPnL];
        }
        logger_1.logger.info('TradingSimulator state restored', {
            balance: this.balance,
            positions: this.positions.size,
            trades: this.trades.length,
        });
    }
}
exports.TradingSimulator = TradingSimulator;
//# sourceMappingURL=trading-simulator.js.map