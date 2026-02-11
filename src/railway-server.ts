/**
 * Railway Combined Server
 * Runs both the dashboard AND week-test on Railway
 * 
 * - Dashboard serves on PORT (Railway-assigned)
 * - Week-test runs as child process, updating test-results.json
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { logger } from './logger';

const PORT = parseInt(process.env.PORT || '3001', 10);

// ============== DASHBOARD SERVER ==============
const app = express();

app.use(express.static(path.join(__dirname, '../public')));

let weekTestProcess: ReturnType<typeof spawn> | null = null;
let weekTestRunning = false;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    weekTestRunning 
  });
});

app.get('/api/status', (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    if (fs.existsSync(resultsPath)) {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ 
        message: 'Waiting for test data...', 
        weekTestRunning,
        hint: 'The week-test will start automatically and create data'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read test data' });
  }
});

app.get('/api/trades', (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to read trade data' });
  }
});

// Export as CSV
app.get('/api/export/csv', (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    if (!fs.existsSync(resultsPath)) {
      res.status(404).send('No data available');
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    const positions = data.positions || [];
    
    // Build CSV
    const headers = ['Symbol', 'Quantity', 'Entry Price', 'Current Price', 'PnL', 'PnL %', 'Status'];
    const rows = positions.map((p: any) => [
      `"${p.symbol}"`,
      p.quantity,
      p.entryPrice,
      p.currentPrice,
      p.pnl?.toFixed(2) || 0,
      p.pnlPercent || 0,
      'OPEN'
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=polymarket-positions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export as JSON
app.get('/api/export/json', (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    if (!fs.existsSync(resultsPath)) {
      res.status(404).json({ error: 'No data available' });
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=polymarket-data-${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// Analytics page
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// Dashboard routes
app.get('/dashboard/pro', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard-pro.html'));
});

app.get('/dashboard/kawaii', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Default to pro dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard-pro.html'));
});

// ============== WEEK TEST SPAWNER ==============
function startWeekTest(): void {
  console.log('🚀 Starting week-test process...');
  
  // Run week-test.js with --resume flag to continue if data exists
  weekTestProcess = spawn('node', [path.join(__dirname, 'week-test.js'), '--resume'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  weekTestRunning = true;
  
  weekTestProcess.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.log(`[week-test] ${output}`);
  });
  
  weekTestProcess.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.error(`[week-test ERROR] ${output}`);
  });
  
  weekTestProcess.on('close', (code) => {
    weekTestRunning = false;
    console.log(`[week-test] Process exited with code ${code}`);
    
    // Restart if it crashed (not if completed normally)
    if (code !== 0 && code !== null) {
      console.log('⚠️ Week-test crashed, restarting in 30 seconds...');
      setTimeout(startWeekTest, 30000);
    }
  });
  
  weekTestProcess.on('error', (err) => {
    weekTestRunning = false;
    console.error('[week-test] Failed to start:', err.message);
  });
}

// ============== GRACEFUL SHUTDOWN ==============
function shutdown(): void {
  console.log('\n⚠️ Shutting down gracefully...');
  
  if (weekTestProcess) {
    weekTestProcess.kill('SIGTERM');
  }
  
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ============== START EVERYTHING ==============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✨ Railway Dashboard running at http://0.0.0.0:${PORT}`);
  console.log('🎀 Poly-chan is ready!\n');
  logger.info('Railway server started', { port: PORT });
  
  // Start week-test after a small delay
  setTimeout(() => {
    startWeekTest();
  }, 3000);
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

