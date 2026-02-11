/**
 * Trading Dashboard Server
 * Real-time monitoring with kawaii anime theme ✨
 * 
 * Improvements:
 *  P2 #12 — Server-Sent Events for real-time push updates
 *  P2 #13 — /api/history endpoint for historical portfolio values
 *  P3 #4  — Optional basic auth via DASHBOARD_TOKEN env var
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── P3 #4: Optional basic auth ────────────────────────────────────
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN; // set to enable auth
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!DASHBOARD_TOKEN) return next(); // no token ⇒ open access
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query['token'];
  if (token === DASHBOARD_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized – set ?token= or Authorization header' });
}
app.use(authMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

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
    } else {
      res.json({ error: 'No test data available yet' });
    }
  } catch {
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
    } else {
      res.json({ positions: [], activity: {} });
    }
  } catch {
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
    } else {
      res.json({ portfolioHistory: [], performanceSnapshots: [] });
    }
  } catch {
    res.status(500).json({ error: 'Failed to read history' });
  }
});

// Persistent trade log (trades.jsonl)
app.get('/api/trade-log', (_req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'trades.jsonl');
    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
      const limit = parseInt(String((_req.query as any).limit) || '100', 10);
      const trades = lines.slice(-limit).map(l => JSON.parse(l));
      res.json(trades);
    } else {
      res.json([]);
    }
  } catch {
    res.status(500).json({ error: 'Failed to read trade log' });
  }
});

// ── P2 #12: Server-Sent Events for real-time push updates ─────────
const sseClients: Set<express.Response> = new Set();

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
  if (sseClients.size === 0) return;
  try {
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    if (fs.existsSync(resultsPath)) {
      const data = fs.readFileSync(resultsPath, 'utf-8');
      for (const client of sseClients) {
        client.write(`data: ${data}\n\n`);
      }
    }
  } catch { /* ignore */ }
}, 30_000);

// Serve dashboard
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✨ Dashboard running at http://0.0.0.0:${PORT}`);
  console.log('🎀 Open in browser to view your kawaii trading dashboard!\n');
  logger.info('Dashboard server started', { port: PORT, authEnabled: !!DASHBOARD_TOKEN });
}).on('error', (err) => {
  console.error('Dashboard server error:', err);
  logger.error('Dashboard server failed to start', { error: err.message });
  process.exit(1);
});
