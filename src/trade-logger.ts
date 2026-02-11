/**
 * Persistent Trade Logger (P2-MEDIUM #15)
 * 
 * Appends every trade to a trades.jsonl (JSON Lines) file so that
 * history is never lost on restart. Also exposes an in-memory
 * ring-buffer of the last N trades for the dashboard.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

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

export class TradeLogger {
  private filePath: string;
  private recentTrades: TradeLogEntry[] = [];
  private readonly maxRecent: number;

  constructor(dir: string = process.cwd(), maxRecent: number = 500) {
    this.filePath = path.join(dir, 'trades.jsonl');
    this.maxRecent = maxRecent;

    // Load existing entries into memory (last N)
    this.loadRecent();
  }

  /** Append a trade to disk and keep in memory ring-buffer. */
  log(entry: TradeLogEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.filePath, line, 'utf-8');

      this.recentTrades.push(entry);
      if (this.recentTrades.length > this.maxRecent) {
        this.recentTrades = this.recentTrades.slice(-this.maxRecent);
      }
    } catch (err) {
      logger.error('TradeLogger: failed to append', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Return the last `n` trades from memory. */
  getRecent(n: number = 50): TradeLogEntry[] {
    return this.recentTrades.slice(-n);
  }

  /** Return all trades from disk. */
  getAll(): TradeLogEntry[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const text = fs.readFileSync(this.filePath, 'utf-8');
      return text
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as TradeLogEntry);
    } catch {
      return [];
    }
  }

  /** Number of trades on disk. */
  count(): number {
    try {
      if (!fs.existsSync(this.filePath)) return 0;
      const text = fs.readFileSync(this.filePath, 'utf-8');
      return text.split('\n').filter(Boolean).length;
    } catch {
      return 0;
    }
  }

  // ── private ──
  private loadRecent(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const text = fs.readFileSync(this.filePath, 'utf-8');
      const lines = text.split('\n').filter(Boolean);
      const start = Math.max(0, lines.length - this.maxRecent);
      this.recentTrades = lines.slice(start).map(l => JSON.parse(l));
      logger.info('TradeLogger: loaded recent history', { count: this.recentTrades.length });
    } catch {
      this.recentTrades = [];
    }
  }
}
