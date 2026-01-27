/**
 * Trading Simulator Module
 * Simulates trades using virtual tokens for testing purposes
 * Tracks virtual balance, positions, and generates fake execution reports
 */

import { logger } from './logger';

export interface VirtualPosition {
  tokenId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualTrade {
  id: string;
  tokenId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  executedAt: Date;
  status: 'pending' | 'executed' | 'failed';
  virtualMode: true;
}

export interface SimulationMetrics {
  startBalance: number;
  currentBalance: number;
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  returnPercentage: number;
}

class TradingSimulator {
  private balance: number;
  private initialBalance: number;
  private positions: Map<string, VirtualPosition> = new Map();
  private trades: VirtualTrade[] = [];
  private realizedPnLHistory: number[] = [];
  private portfolioValueHistory: { timestamp: Date; value: number }[] = [];

  constructor(initialBalance: number = 10000) {
    if (initialBalance <= 0) {
      throw new Error('Initial balance must be positive');
    }
    this.balance = initialBalance;
    this.initialBalance = initialBalance;
    logger.info('TradingSimulator initialized', { initialBalance });
  }

  /**
   * Validate trade parameters
   */
  private validateTradeParams(tokenId: string, symbol: string, quantity: number, price: number): void {
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
  async simulateBuy(
    tokenId: string,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<VirtualTrade> {
    // Input validation
    this.validateTradeParams(tokenId, symbol, quantity, price);

    const totalValue = quantity * price;
    const fees = totalValue * 0.001; // 0.1% fee
    const totalCost = totalValue + fees;

    if (this.balance < totalCost) {
      logger.warn('Insufficient virtual balance for buy order', {
        required: totalCost,
        available: this.balance,
      });
      throw new Error(`Insufficient balance: ${this.balance} < ${totalCost}`);
    }

    // Deduct from balance
    this.balance -= totalCost;

    // Create or update position
    const existingPosition = this.positions.get(tokenId);
    const newPosition: VirtualPosition = {
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
    const trade: VirtualTrade = {
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

    logger.info('Virtual buy executed', {
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
  async simulateSell(
    tokenId: string,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<VirtualTrade> {
    // Input validation
    this.validateTradeParams(tokenId, symbol, quantity, price);

    const position = this.positions.get(tokenId);

    if (!position || position.quantity < quantity) {
      logger.warn('Insufficient position for sell order', {
        symbol,
        required: quantity,
        available: position?.quantity || 0,
      });
      throw new Error(
        `Insufficient position: ${position?.quantity || 0} < ${quantity}`
      );
    }

    const totalValue = quantity * price;
    const fees = totalValue * 0.001; // 0.1% fee
    const netProceeds = totalValue - fees;

    // Add to balance
    this.balance += netProceeds;

    // Calculate PnL
    const costBasis = quantity * position.entryPrice;
    const pnl = netProceeds - costBasis;

    // Update or remove position
    if (position.quantity === quantity) {
      this.positions.delete(tokenId);
    } else {
      position.quantity -= quantity;
      position.updatedAt = new Date();
      this.positions.set(tokenId, position);
    }

    // Track realized PnL
    this.realizedPnLHistory.push(pnl);

    // Create trade record
    const trade: VirtualTrade = {
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

    logger.info('Virtual sell executed', {
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
  updatePrices(priceUpdates: { tokenId: string; price: number }[]): void {
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

    logger.debug('Prices updated', {
      positions: this.positions.size,
      unrealizedPnL: totalUnrealizedPnL,
    });
  }

  /**
   * Get current portfolio state
   */
  getPortfolioState(): {
    balance: number;
    positions: VirtualPosition[];
    totalValue: number;
    unrealizedPnL: number;
  } {
    const positions = Array.from(this.positions.values());
    const unrealizedPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const totalPositionsValue = positions.reduce(
      (sum, p) => sum + p.currentPrice * p.quantity,
      0
    );
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
  getMetrics(): SimulationMetrics {
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
      returnPercentage:
        ((portfolio.totalValue - this.initialBalance) / this.initialBalance) *
        100,
    };
  }

  /**
   * Calculate maximum drawdown from TOTAL PORTFOLIO VALUE (not just cash)
   */
  private calculateMaxDrawdown(): number {
    if (this.portfolioValueHistory.length < 2) return 0;

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
   */
  private updatePortfolioHistory(): void {
    const portfolio = this.getPortfolioState();
    this.portfolioValueHistory.push({
      timestamp: new Date(),
      value: portfolio.totalValue,
    });
  }

  /**
   * Get all trades
   */
  getTrades(): VirtualTrade[] {
    return [...this.trades];
  }

  /**
   * Reset simulation
   */
  reset(): void {
    this.balance = this.initialBalance;
    this.positions.clear();
    this.trades = [];
    this.realizedPnLHistory = [];
    this.portfolioValueHistory = [];
    logger.info('Trading simulator reset');
  }

  /**
   * Get trades by side
   */
  getTradesByType(side: 'BUY' | 'SELL'): VirtualTrade[] {
    return this.trades.filter(t => t.side === side);
  }
}

export { TradingSimulator };
