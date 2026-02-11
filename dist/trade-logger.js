"use strict";
/**
 * Persistent Trade Logger (P2-MEDIUM #15)
 *
 * Appends every trade to a trades.jsonl (JSON Lines) file so that
 * history is never lost on restart. Also exposes an in-memory
 * ring-buffer of the last N trades for the dashboard.
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
exports.TradeLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
class TradeLogger {
    constructor(dir = process.cwd(), maxRecent = 500) {
        this.recentTrades = [];
        this.filePath = path.join(dir, 'trades.jsonl');
        this.maxRecent = maxRecent;
        // Load existing entries into memory (last N)
        this.loadRecent();
    }
    /** Append a trade to disk and keep in memory ring-buffer. */
    log(entry) {
        try {
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.filePath, line, 'utf-8');
            this.recentTrades.push(entry);
            if (this.recentTrades.length > this.maxRecent) {
                this.recentTrades = this.recentTrades.slice(-this.maxRecent);
            }
        }
        catch (err) {
            logger_1.logger.error('TradeLogger: failed to append', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    /** Return the last `n` trades from memory. */
    getRecent(n = 50) {
        return this.recentTrades.slice(-n);
    }
    /** Return all trades from disk. */
    getAll() {
        try {
            if (!fs.existsSync(this.filePath))
                return [];
            const text = fs.readFileSync(this.filePath, 'utf-8');
            return text
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));
        }
        catch {
            return [];
        }
    }
    /** Number of trades on disk. */
    count() {
        try {
            if (!fs.existsSync(this.filePath))
                return 0;
            const text = fs.readFileSync(this.filePath, 'utf-8');
            return text.split('\n').filter(Boolean).length;
        }
        catch {
            return 0;
        }
    }
    // ── private ──
    loadRecent() {
        try {
            if (!fs.existsSync(this.filePath))
                return;
            const text = fs.readFileSync(this.filePath, 'utf-8');
            const lines = text.split('\n').filter(Boolean);
            const start = Math.max(0, lines.length - this.maxRecent);
            this.recentTrades = lines.slice(start).map(l => JSON.parse(l));
            logger_1.logger.info('TradeLogger: loaded recent history', { count: this.recentTrades.length });
        }
        catch {
            this.recentTrades = [];
        }
    }
}
exports.TradeLogger = TradeLogger;
//# sourceMappingURL=trade-logger.js.map