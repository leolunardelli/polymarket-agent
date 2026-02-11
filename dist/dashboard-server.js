"use strict";
/**
 * Trading Dashboard Server
 * Real-time monitoring with kawaii anime theme ✨
 *
 * Improvements:
 *  P2 #12 — Server-Sent Events for real-time push updates
 *  P2 #13 — /api/history endpoint for historical portfolio values
 *  P3 #4  — Optional basic auth via DASHBOARD_TOKEN env var
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
// ── P3 #4: Optional basic auth ────────────────────────────────────
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN; // set to enable auth
function authMiddleware(req, res, next) {
    if (!DASHBOARD_TOKEN)
        return next(); // no token ⇒ open access
    const token = req.headers['authorization']?.replace('Bearer ', '') || req.query['token'];
    if (token === DASHBOARD_TOKEN)
        return next();
    res.status(401).json({ error: 'Unauthorized – set ?token= or Authorization header' });
}
app.use(authMiddleware);
// Serve static files
app.use(express_1.default.static(path.join(__dirname, '../public')));
// Health check endpoint for monitoring/Railway (no auth)
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// API endpoint for real-time data
app.get('/api/status', (_req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json(data);
        }
        else {
            res.json({ error: 'No test data available yet' });
        }
    }
    catch {
        res.status(500).json({ error: 'Failed to read test data' });
    }
});
// API endpoint for trade history from logs
app.get('/api/trades', (_req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json({
                positions: data.positions || [],
                activity: data.activity || {},
            });
        }
        else {
            res.json({ positions: [], activity: {} });
        }
    }
    catch {
        res.status(500).json({ error: 'Failed to read trade data' });
    }
});
// ── P2 #13: Historical portfolio values & persistent trade log ────
app.get('/api/history', (_req, res) => {
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            res.json({
                portfolioHistory: data.portfolioHistory || [],
                performanceSnapshots: data.performanceSnapshots || [],
            });
        }
        else {
            res.json({ portfolioHistory: [], performanceSnapshots: [] });
        }
    }
    catch {
        res.status(500).json({ error: 'Failed to read history' });
    }
});
// Persistent trade log (trades.jsonl)
app.get('/api/trade-log', (_req, res) => {
    try {
        const logPath = path.join(process.cwd(), 'trades.jsonl');
        if (fs.existsSync(logPath)) {
            const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
            const limit = parseInt(String(_req.query.limit) || '100', 10);
            const trades = lines.slice(-limit).map(l => JSON.parse(l));
            res.json(trades);
        }
        else {
            res.json([]);
        }
    }
    catch {
        res.status(500).json({ error: 'Failed to read trade log' });
    }
});
// ── P2 #12: Server-Sent Events for real-time push updates ─────────
const sseClients = new Set();
app.get('/api/stream', (_req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.write('data: {"connected":true}\n\n');
    sseClients.add(res);
    _req.on('close', () => sseClients.delete(res));
});
// Push update to all SSE clients every 30 seconds
setInterval(() => {
    if (sseClients.size === 0)
        return;
    try {
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
            const data = fs.readFileSync(resultsPath, 'utf-8');
            for (const client of sseClients) {
                client.write(`data: ${data}\n\n`);
            }
        }
    }
    catch { /* ignore */ }
}, 30000);
// Serve dashboard
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ Dashboard running at http://0.0.0.0:${PORT}`);
    console.log('🎀 Open in browser to view your kawaii trading dashboard!\n');
    logger_1.logger.info('Dashboard server started', { port: PORT, authEnabled: !!DASHBOARD_TOKEN });
}).on('error', (err) => {
    console.error('Dashboard server error:', err);
    logger_1.logger.error('Dashboard server failed to start', { error: err.message });
    process.exit(1);
});
//# sourceMappingURL=dashboard-server.js.map