# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd c:\Users\leonardo.lunardelli\polymarket-agent
npm install
```

### 2. Configure Environment
```bash
# Copy example config
copy .env.example .env

# Edit .env with your Polymarket API key
# POLYMARKET_API_KEY=your_actual_api_key_here
```

### 3. Compile TypeScript
```bash
npm run build
```

### 4. Run the System
```bash
npm start
```

## What Happens When You Run It

1. ✅ System initializes with your configuration
2. ✅ Connects to Polymarket API
3. ✅ Opens WebSocket for real-time updates
4. ✅ Initializes database
5. ✅ Displays current portfolio status
6. ✅ Analyzes sample markets
7. ✅ Shows trading recommendations
8. ✅ Executes trades (if approved by risk checks)
9. ✅ Generates backtest report
10. ✅ Continues monitoring in real-time

## Development Mode

For faster iteration with auto-reload:

```bash
npm run dev
```

This uses ts-node to run TypeScript directly without compilation.

## Key Components Usage

### 1. Polymarket API
```typescript
import { PolymarketAPI } from './src/polymarket-api';

const api = new PolymarketAPI({
  apiKey: 'your-key',
  rateLimit: { maxRequests: 100, windowMs: 60000 }
});

const markets = await api.getMarkets({ limit: 10 });
const market = await api.getMarket('market-slug');
const orderbook = await api.getOrderbook('token-id');
```

### 2. WebSocket for Real-Time Data
```typescript
import { PolymarketWebSocket } from './src/websocket';

const ws = new PolymarketWebSocket();
await ws.connect();

ws.subscribeToPrice('token-id', (update) => {
  console.log(`Price: ${update.price}`);
});
```

### 3. Database Operations
```typescript
import { TradingDatabase } from './src/database';

const db = new TradingDatabase('./data/trading.db');

// Insert a trade
const tradeId = db.insertTrade({
  market_id: 'market1',
  token_id: 'token1',
  side: 'BUY',
  price: 0.55,
  size: 100,
  timestamp: Date.now(),
  fees: 0.5
});

// Get trades
const trades = db.getTrades({ limit: 100 });
```

### 4. Analytics
```typescript
import { AnalyticsEngine } from './src/analytics';

const analytics = new AnalyticsEngine(db);

// Calculate Kelly Criterion
const kelly = analytics.calculateKelly(0.6, 2.0, 10000);
console.log(kelly.fraction); // Recommended bet fraction

// Performance metrics
const metrics = analytics.calculatePerformanceMetrics(trades);
console.log(metrics.sharpe_ratio);
```

### 5. Portfolio Management
```typescript
import { PortfolioManager } from './src/portfolio';

const portfolio = new PortfolioManager(db, analytics);

// Calculate position size
const sizing = portfolio.calculatePositionSize(
  'token-id',
  0.6,           // probability
  2.0,           // odds
  100000,        // liquidity
  10000          // portfolio value
);

// Check risk limits
const check = portfolio.checkRiskLimits(
  'token-id',
  100,           // proposed size
  0.55,          // current price
  10000          // portfolio value
);

console.log(check.approved); // true/false
```

### 6. Sentiment Analysis
```typescript
import { SentimentAnalyzer } from './src/sentiment';

const analyzer = new SentimentAnalyzer();

// Analyze single text
const sentiment = analyzer.analyzeSentiment(
  'This market is very bullish and looks great!'
);
console.log(sentiment.label); // 'POSITIVE'

// Aggregate multiple sources
const aggregated = analyzer.aggregateSentiment([
  {
    source: 'twitter',
    text: 'Very positive',
    timestamp: Date.now(),
    engagement: 100,
    author_influence: 0.8
  }
]);
```

### 7. Notifications
```typescript
import { NotificationSystem } from './src/notifications';

const notifications = new NotificationSystem();

notifications.setUserPreferences('user-id', {
  user_id: 'user-id',
  channels: [
    {
      type: 'webhook',
      enabled: true,
      config: { endpoint: 'https://webhook.site/xxx' }
    }
  ],
  filters: {
    min_severity: 'MEDIUM',
    categories: new Set(['PRICE_ALERT', 'RISK_WARNING']),
    rate_limit: { max_per_hour: 10, max_per_day: 50 }
  }
});

// Send notification
await notifications.send(
  'user-id',
  'PRICE_ALERT',
  'HIGH',
  {
    market: 'Bitcoin Price',
    price: 45000,
    change: 5.2
  }
);
```

### 8. Full Trading System
```typescript
import { TradingSystem } from './src/integration';

const system = new TradingSystem({
  api: { apiKey: process.env.POLYMARKET_API_KEY },
  database: { path: './data/trading.db' },
  portfolio: {
    max_position_size: 0.20,
    max_portfolio_risk: 0.50
  },
  websocket: { enabled: true },
  notifications: {
    user_id: 'trader-001',
    channels: [/* ... */]
  }
});

// Start monitoring
await system.start();

// Evaluate a market
const analysis = await system.evaluateMarket('market-slug');
console.log(analysis.recommendation); // 'BUY' | 'SELL' | 'HOLD'

// Execute trade
if (analysis.recommendation === 'BUY') {
  const tradeId = await system.executeTrade(
    analysis.market.condition_id,
    token.token_id,
    'BUY',
    size,
    price
  );
}

// Get portfolio summary
const summary = system.getPortfolioSummary();
console.log(summary.stats.total_pnl);
console.log(summary.performance.win_rate);

// Run backtest
const backtest = await system.backtest(
  ['market-1', 'market-2'],
  Date.now() - 30*24*60*60*1000,  // 30 days ago
  Date.now()
);
console.log(backtest.total_trades);
console.log(backtest.total_pnl);
```

## Project Structure Overview

```
src/
├── polymarket-api.ts       # API client - Connect to Polymarket
├── websocket.ts            # WebSocket - Real-time data
├── database.ts             # SQLite - Data persistence
├── analytics.ts            # Analytics - Metrics & Kelly
├── portfolio.ts            # Portfolio - Risk & sizing
├── sentiment.ts            # Sentiment - Text analysis
├── notifications.ts        # Alerts - Multi-channel
├── integration.ts          # TradingSystem - Orchestrator
└── index.ts               # Entry point - CLI app
```

## Common Tasks

### Check Current Portfolio
```bash
npm start  # Will show current portfolio summary
```

### Analyze a Specific Market
```typescript
const analysis = await system.evaluateMarket('market-slug');
console.log(analysis.recommendation);
console.log(analysis.kelly.fraction);
console.log(analysis.risk_check.approved);
```

### View Trade History
```typescript
const trades = db.getTrades({ limit: 100 });
const metrics = analytics.calculatePerformanceMetrics(trades);
console.log(`Win Rate: ${metrics.win_rate * 100}%`);
console.log(`Sharpe Ratio: ${metrics.sharpe_ratio}`);
```

### Test Risk Limits
```typescript
const check = portfolio.checkRiskLimits(token_id, size, price, portfolioValue);
if (check.approved) {
  console.log('Trade approved!');
} else {
  console.log('Violations:', check.violations);
}
```

### Get Sentiment Signal
```typescript
const signal = analyzer.generateSentimentSignal(current, historical);
console.log(signal.signal);      // 'BUY' | 'SELL' | 'HOLD'
console.log(signal.strength);    // 0-1
console.log(signal.rationale);   // ['reason 1', 'reason 2']
```

## Configuration Options

### API Rate Limiting
```typescript
{
  rateLimit: {
    maxRequests: 100,    // requests
    windowMs: 60000      // milliseconds
  }
}
```

### Portfolio Limits
```typescript
{
  max_position_size: 0.20,      // 20% of portfolio
  max_portfolio_risk: 0.50,     // 50% total exposure
  max_correlation: 0.70,        // max correlation
  max_drawdown_threshold: 0.25, // 25% max drawdown
  min_liquidity: 10000,         // minimum market liquidity
  max_positions: 10,            // maximum open positions
  rebalance_threshold: 0.10     // 10% rebalance trigger
}
```

## Debugging

### Enable Detailed Logging
```typescript
console.log('Database initialized');
console.log('WebSocket connected:', ws.isConnected());
console.log('API Rate Limiter:', api.rateLimiter);
```

### Monitor Performance
```typescript
const before = Date.now();
await api.getMarkets({ limit: 100 });
const duration = Date.now() - before;
console.log(`API call took ${duration}ms`);
```

### Database Diagnostics
```typescript
const positions = db.getPositions();
const trades = db.getTrades({ limit: 1 });
const latest_metrics = db.getLatestPerformanceMetrics();
```

## Stopping the System

Press `Ctrl+C` to gracefully shutdown:
- Closes database connections
- Disconnects WebSocket
- Saves any pending data
- Cleans up resources

## Next Steps

1. **Real API Key**: Get a Polymarket API key at https://polymarket.com
2. **Configure Notifications**: Set up webhook, email, or SMS endpoints
3. **Backtest**: Analyze historical performance
4. **Paper Trading**: Test with small amounts first
5. **Optimize**: Adjust risk limits for your comfort level
6. **Monitor**: Set up alerts and watch the portfolio

## Getting Help

- Check README.md for detailed documentation
- Review IMPLEMENTATION.md for technical details
- Examine source code comments for implementation specifics
- Refer to inline TypeScript documentation

## Support Resources

- Polymarket API Docs: https://docs.polymarket.com
- WebSocket: ws://polymarket.com
- Community: https://discord.gg/polymarket

---

**You're all set!** The Polymarket Trading System is ready to go. Start with `npm start` and watch it analyze markets and make trading decisions.
