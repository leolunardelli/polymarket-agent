# 1-Week Live Test Configuration Guide

## Overview
This document outlines the setup for a 1-week live test of the Polymarket Agent using the provided API credentials and virtual token trading (no real money involved).

**Test Period:** 7 days  
**Trade Mode:** Virtual tokens (fake buy orders for testing)  
**API Credentials:** Configured  
**Metrics:** Highest winrate leaderboard analysis  

---

## Configuration Setup

### API Credentials
The following credentials are configured in `.env`:

```
POLYMARKET_API_KEY=019c019a-7169-7d77-a3c9-4f9e6c00f3e2
POLYMARKET_PRIVATE_KEY=I5URBnVlvweCA7b7o-S_3taT9-m4ynVRw6Z1A9DoznA=
POLYMARKET_PASSPHRASE=41b9caee5da44c4646bb936dc29bc731ea62adc20dbc830b85438389830baf84
POLYMARKET_SECRET=I5URBnVlvweCA7b7o-S_3taT9-m4ynVRw6Z1A9DoznA=
```

### Test Mode Settings
```env
TEST_MODE_ENABLED=true
VIRTUAL_BALANCE=10000
TEST_DURATION_DAYS=7
LEADERBOARD_ENABLED=true
METRICS_SOURCE=leaderboard
FEATURE_AUTOMATED_TRADING=true
```

---

## Key Components

### 1. Trading Simulator (`src/trading-simulator.ts`)
Simulates buy/sell orders with virtual tokens without real transactions.

**Features:**
- Virtual balance starting at $10,000
- Buy/Sell order simulation
- Position tracking
- Realized and unrealized P&L calculation
- Trade execution metrics
- Win rate calculation

**Usage:**
```typescript
import { TradingSimulator } from './trading-simulator';

const simulator = new TradingSimulator(10000); // Start with $10k virtual balance

// Simulate a buy order
await simulator.simulateBuy('token_123', 'YES', 100, 0.65);

// Simulate a sell order
await simulator.simulateSell('token_123', 'YES', 50, 0.72);

// Get current metrics
const metrics = simulator.getMetrics();
console.log(`Win Rate: ${metrics.winRate}%`);
console.log(`Total P&L: $${metrics.totalPnL}`);
```

### 2. Leaderboard Analyzer (`src/leaderboard-analyzer.ts`)
Fetches and analyzes Polymarket leaderboards to identify top traders by win rate.

**Features:**
- Fetch top traders by win rate (week/month/all-time)
- Compare monthly vs weekly P&L metrics
- Identify top performers with minimum thresholds
- Track trader consistency
- Compare multiple traders

**Usage:**
```typescript
import { LeaderboardAnalyzer } from './leaderboard-analyzer';
import { PolymarketAPI } from './polymarket-api';

const api = new PolymarketAPI({ /* config */ });
const analyzer = new LeaderboardAnalyzer(api);

// Get top traders for the month
const topTraders = await analyzer.getTopTradersByWinRate('month', 20);
console.log(`Top trader win rate: ${topTraders[0].winRate}%`);

// Compare week vs month P&L for a trader
const comparison = await analyzer.compareTimeframePnL('0xTraderAddress');
console.log(`Weekly P&L: $${comparison.weeklyPnL}`);
console.log(`Monthly P&L: $${comparison.monthlyPnL}`);
console.log(`Trend: ${comparison.trend}`);

// Identify top performers
const topPerformers = await analyzer.identifyTopPerformers(
  'month', 
  55,    // Minimum 55% win rate
  10,    // Minimum 10 trades
  10     // Top 10 performers
);
```

### 3. Environment Configuration (`src/env-config.ts`)
Enhanced with test mode and leaderboard settings:

```typescript
testMode: {
  enabled: boolean,           // TEST_MODE_ENABLED
  virtualBalance: number,     // VIRTUAL_BALANCE (default: 10000)
  durationDays: number,       // TEST_DURATION_DAYS (default: 7)
  leaderboardEnabled: boolean, // LEADERBOARD_ENABLED
  metricsSource: 'leaderboard' | 'manual', // METRICS_SOURCE
  passphrase: string,         // POLYMARKET_PASSPHRASE
  secret: string,             // POLYMARKET_SECRET
}
```

---

## Running the Test

### 1. Start Docker Services
```bash
docker-compose up -d
```

### 2. Verify API Connection
```bash
# Check Polymarket API connectivity
npm run health:check

# View logs
docker-compose logs -f api
```

### 3. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 4. Monitor Trading Metrics
The application will automatically:
- Fetch leaderboard data every 5 minutes
- Identify top traders (>55% win rate)
- Simulate trades based on leaderboard signals
- Track virtual P&L
- Log all metrics

---

## Metrics & Analysis

### Win Rate Calculation
```
Win Rate = (Profitable Trades / Total Trades) × 100
```

### Month vs Week Comparison
- **Weekly P&L:** Short-term performance indicator
- **Monthly P&L:** Long-term consistency check
- **Trend:** 
  - `improving`: Weekly > Monthly average × 0.25
  - `declining`: Weekly < Monthly average × 0.15
  - `stable`: Between improving and declining

### Leaderboard Metrics
The analyzer tracks:
- **Total Trades:** Number of closed positions
- **Win Rate:** Percentage of profitable trades
- **Average Win:** Average profit on winning trades
- **Average Loss:** Average loss on losing trades
- **Monthly P&L:** Realized profit/loss for the month
- **Weekly P&L:** Realized profit/loss for the week
- **Rank:** Position in leaderboard

### Trading Simulator Metrics
```typescript
interface SimulationMetrics {
  startBalance: number;          // Initial virtual balance
  currentBalance: number;         // Current cash on hand
  totalValue: number;             // Balance + position values
  unrealizedPnL: number;         // P&L from open positions
  realizedPnL: number;           // P&L from closed positions
  totalPnL: number;              // realizedPnL + unrealizedPnL
  winRate: number;               // Percentage of winning trades
  totalTrades: number;           // All buy/sell orders
  winningTrades: number;         // Closed positions with profit
  losingTrades: number;          // Closed positions with loss
  averageWin: number;            // Average profit per winning trade
  averageLoss: number;           // Average loss per losing trade
  largestWin: number;            // Maximum single trade profit
  largestLoss: number;           // Maximum single trade loss
  maxDrawdown: number;           // Largest peak-to-trough decline
  returnPercentage: number;      // (totalValue - startBalance) / startBalance × 100
}
```

---

## Expected Output

### Leaderboard Analysis
```json
{
  "topTraders": [
    {
      "address": "0x...",
      "username": "top_trader_1",
      "winRate": 68.5,
      "monthlyPnL": 5234.50,
      "weeklyPnL": 1245.75,
      "totalTrades": 85,
      "profitableTrades": 58,
      "rank": 1
    },
    ...
  ],
  "period": "month",
  "topCount": 20
}
```

### Virtual Trading Metrics
```json
{
  "startBalance": 10000,
  "currentBalance": 9847.32,
  "totalValue": 11234.56,
  "unrealizedPnL": 1387.24,
  "realizedPnL": -152.68,
  "totalPnL": 1234.56,
  "winRate": 62.5,
  "totalTrades": 24,
  "winningTrades": 15,
  "losingTrades": 9,
  "averageWin": 127.45,
  "averageLoss": -89.75,
  "largestWin": 450.00,
  "largestLoss": -245.00,
  "maxDrawdown": 8.5,
  "returnPercentage": 12.35
}
```

---

## Test Duration & Checkpoints

### Week 1: Initial Testing
- **Days 1-2:** Validate API connections and leaderboard fetching
- **Days 3-4:** Test virtual trading with top traders' signals
- **Days 5-7:** Monitor metrics and accumulate performance data

### Daily Checkpoints
```bash
# View current metrics
curl http://localhost:3000/metrics

# Check virtual balance and positions
curl http://localhost:3000/api/simulator/metrics

# Get leaderboard analysis
curl http://localhost:3000/api/leaderboard/top-traders?period=week

# View recent trades
curl http://localhost:3000/api/simulator/trades
```

---

## APIs & Endpoints (When Implemented)

### Trading Simulator Endpoints
```
GET  /api/simulator/metrics      - Current P&L metrics
GET  /api/simulator/positions    - Open positions
GET  /api/simulator/trades       - All executed trades
POST /api/simulator/buy          - Execute virtual buy
POST /api/simulator/sell         - Execute virtual sell
POST /api/simulator/reset        - Reset to initial balance
```

### Leaderboard Endpoints
```
GET  /api/leaderboard/top-traders     - Top traders by win rate
GET  /api/leaderboard/top-performers  - Performers above threshold
GET  /api/leaderboard/trader/:address - Individual trader metrics
GET  /api/leaderboard/comparison      - Compare multiple traders
```

---

## Important Notes

### Virtual Token Mode
- ✅ **No real money is at risk**
- ✅ **No actual orders are placed**
- ✅ Simulates order execution and fills
- ✅ Tracks P&L accurately for testing

### Leaderboard Data
- Fetched from Polymarket public APIs
- Updated every 5 minutes (configurable)
- Metrics based on actual historical data
- Identifies proven traders (>55% win rate)

### Test Duration
- The 7-day test will run continuously
- Metrics accumulate throughout the period
- Final report generated at day 7

---

## Troubleshooting

### API Connection Issues
```bash
# Test API connectivity
curl https://gamma-api.polymarket.com/events?limit=1

# Check authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://gamma-api.polymarket.com/events?limit=1
```

### Virtual Balance Exceeded
```
Error: Insufficient balance: 9500 < 10000
Solution: Reduce position size or reset simulator
```

### Leaderboard Data Not Loading
```
Check: LEADERBOARD_ENABLED=true
Check: METRICS_SOURCE=leaderboard
Check: API rate limits not exceeded
```

---

## Configuration Reference

| Setting | Value | Description |
|---------|-------|-------------|
| TEST_MODE_ENABLED | true | Enable virtual trading |
| VIRTUAL_BALANCE | 10000 | Starting balance ($) |
| TEST_DURATION_DAYS | 7 | Test period |
| LEADERBOARD_ENABLED | true | Track leaderboard metrics |
| METRICS_SOURCE | leaderboard | Use leaderboard data |
| FEATURE_AUTOMATED_TRADING | true | Enable auto-trading |
| LOG_LEVEL | INFO | Logging verbosity |
| FEATURE_LIQUIDITY_ANALYSIS | true | Analyze liquidity |
| FEATURE_SENTIMENT_ANALYSIS | true | Analyze sentiment |

---

## Success Criteria

The 1-week test is successful if:

1. ✅ API credentials validate correctly
2. ✅ Leaderboard data fetches without errors
3. ✅ Virtual trades execute without account errors
4. ✅ Win rate > 50% (benchmark)
5. ✅ Total P&L > $0 (profitable)
6. ✅ Max drawdown < 20% (acceptable volatility)
7. ✅ All metrics logged and trackable

---

## Next Steps

After the 1-week test:
1. Analyze accumulated metrics
2. Compare virtual performance vs leaderboard traders
3. Identify profitable trading patterns
4. Consider real trading with validated strategy
5. Implement risk management rules

---

**Test Start Time:** [To be recorded]  
**Expected Completion:** [+7 days]  
**Status:** Ready for deployment
