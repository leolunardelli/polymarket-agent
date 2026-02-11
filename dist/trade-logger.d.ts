/**
 * Persistent Trade Logger (P2-MEDIUM #15)
 *
 * Appends every trade to a trades.jsonl (JSON Lines) file so that
 * history is never lost on restart. Also exposes an in-memory
 * ring-buffer of the last N trades for the dashboard.
 */
export interface TradeLogEntry {
    id: string;
    timestamp: string;
    tokenId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalValue: number;
    fees: number;
    slippage?: number;
    reason?: string;
    confidence?: number;
    pnl?: number;
    portfolioValueAfter?: number;
}
export declare class TradeLogger {
    private filePath;
    private recentTrades;
    private readonly maxRecent;
    constructor(dir?: string, maxRecent?: number);
    /** Append a trade to disk and keep in memory ring-buffer. */
    log(entry: TradeLogEntry): void;
    /** Return the last `n` trades from memory. */
    getRecent(n?: number): TradeLogEntry[];
    /** Return all trades from disk. */
    getAll(): TradeLogEntry[];
    /** Number of trades on disk. */
    count(): number;
    private loadRecent;
}
//# sourceMappingURL=trade-logger.d.ts.map