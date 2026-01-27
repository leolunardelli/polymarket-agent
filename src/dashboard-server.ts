/**
 * Trading Dashboard Server
 * Real-time monitoring with kawaii anime theme ✨
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint for real-time data
app.get('/api/status', (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    if (fs.existsSync(resultsPath)) {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ error: 'No test data available yet' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read test data' });
  }
});

// API endpoint for trade history from logs
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

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`\n✨ Dashboard running at http://localhost:${PORT}`);
  console.log('🎀 Open in browser to view your kawaii trading dashboard!\n');
  logger.info('Dashboard server started', { port: PORT });
});
