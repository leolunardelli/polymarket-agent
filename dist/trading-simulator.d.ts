/**
 * Trading Simulator Module
 * Simulates trades using virtual tokens for testing purposes
 * Tracks virtual balance, positions, and generates fake execution reports
 */
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
declare class TradingSimulator {
    private balance;
    private initialBalance;
    private positions;
    private trades;
    private realizedPnLHistory;
    private portfolioValueHistory;
    constructor(initialBalance?: number);
    /**
     * Validate trade parameters
     */
    private validateTradeParams;
    /**
     * Simulate a BUY order with virtual tokens
     */
    simulateBuy(tokenId: string, symbol: string, quantity: number, price: number): Promise<VirtualTrade>;
    /**
     * Simulate a SELL order with virtual tokens
     */
    simulateSell(tokenId: string, symbol: string, quantity: number, price: number): Promise<VirtualTrade>;
    /**
     * Update prices for all open positions (simulates market movement)
     */
    updatePrices(priceUpdates: {
        tokenId: string;
        price: number;
    }[]): void;
    /**
     * Get current portfolio state
     */
    getPortfolioState(): {
        balance: number;
        positions: VirtualPosition[];
        totalValue: number;
        unrealizedPnL: number;
    };
    /**
     * Get complete trading metrics
     */
    getMetrics(): SimulationMetrics;
    /**
     * Calculate maximum drawdown from TOTAL PORTFOLIO VALUE (not just cash)
     */
    private calculateMaxDrawdown;
    /**
     * Record portfolio value to history (includes positions value)
     */
    private updatePortfolioHistory;
    /**
     * Get all trades
     */
    getTrades(): VirtualTrade[];
    /**
     * Reset simulation
     */
    reset(): void;
    /**
     * Get trades by side
     */
    getTradesByType(side: 'BUY' | 'SELL'): VirtualTrade[];
    /**
     * Restore simulator state from saved data (for resume functionality)
     */
    restoreState(state: {
        balance: number;
        realizedPnL: number;
        winningTrades: number;
        losingTrades: number;
        trades: VirtualTrade[];
        positions: Array<{
            symbol: string;
            tokenId?: string;
            quantity: number;
            entryPrice: number;
            currentPrice: number;
            pnl?: number;
            pnlPercent?: string;
            pnlPercentage?: number;
        }>;
    }): void;
}
export { TradingSimulator };
//# sourceMappingURL=trading-simulator.d.ts.map