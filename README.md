# Polymarket Trading System

Trading system for Polymarket prediction markets with portfolio management, risk analysis, and sentiment analysis.

## Features

- **Market Data API**: Real-time market data, orderbooks, and price history
- **WebSocket**: Live price updates and order tracking
- **Database**: SQLite persistent storage
- **Analytics**: Kelly Criterion, Sharpe/Sortino ratios, correlation analysis
- **Portfolio**: Position sizing, risk limits, rebalancing recommendations
- **Sentiment Analysis**: Text-based sentiment extraction and aggregation
- **Notifications**: Multi-channel alerts (email, SMS, push, webhooks)
- **Risk Management**: Drawdown tracking, portfolio metrics, position correlation
- **Backtesting**: Performance analysis and Monte Carlo simulations

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
POLYMARKET_API_KEY=your_api_key_here
NODE_ENV=production
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## Project Structure

```
src/
├── polymarket-api.ts      # API client with caching and rate limiting
├── websocket.ts           # WebSocket connection handler
├── database.ts            # SQLite database operations
├── analytics.ts           # Trading analytics and metrics
├── portfolio.ts           # Portfolio management and risk analysis
├── sentiment.ts           # Sentiment analysis engine
├── notifications.ts       # Multi-channel notification system
├── integration.ts         # Main trading system coordinator
└── index.ts              # Entry point and CLI
```

## Key Components

### PolymarketAPI
- Market and event data fetching
- Orderbook management
- Price history retrieval
- Automatic rate limiting and caching

### PolymarketWebSocket
- Real-time price updates
- Order and trade notifications
- Automatic reconnection with exponential backoff
- Multiple subscription channels

### TradingDatabase
- Position and trade tracking
- Market data persistence
- Performance metrics storage
- Correlation calculations

### AnalyticsEngine
- Kelly Criterion calculation
- Performance metrics (Sharpe, Sortino, max drawdown)
- Correlation matrix computation
- Risk metrics (VaR, Beta)
- Monte Carlo simulations

### PortfolioManager
- Dynamic position sizing
- Risk limit enforcement
- Portfolio optimization
- Rebalancing recommendations
- Concentration/correlation risk metrics

### SentimentAnalyzer
- Text-based sentiment extraction
- Temporal decay weighting
- Anomaly detection
- Sentiment momentum tracking

### NotificationSystem
- Multi-channel delivery (email, SMS, push, webhooks)
- User preferences and filtering
- Rate limiting
- Quiet hours support
- HTML email templates

## Market Analysis Example

```typescript
const system = new TradingSystem(config);
await system.start();

const analysis = await system.evaluateMarket('market-slug');
console.log(analysis.recommendation); // 'BUY' | 'SELL' | 'HOLD'

if (analysis.recommendation === 'BUY' && analysis.risk_check.approved) {
  const tradeId = await system.executeTrade(
    analysis.market.condition_id,
    token.token_id,
    'BUY',
    size,
    price
  );
}
```

## Risk Management Features

- **Position Limits**: Maximum position size as % of portfolio
- **Portfolio Risk**: Maximum total exposure limits
- **Correlation Limits**: Avoid correlated positions
- **Drawdown Monitoring**: Track maximum drawdown thresholds
- **Liquidity Checks**: Ensure minimum market liquidity
- **Concentration Risk**: Herfindahl index-based concentration metrics

## Performance Metrics

- Total P&L and % returns
- Win rate and profit factor
- Sharpe and Sortino ratios
- Maximum drawdown analysis
- Average trade duration
- Trade statistics (wins/losses)

## Database Schema

### positions
- Tracks open and closed positions
- Records entry price, current price, and P&L
- Maintains position status and timestamps

### trades
- Complete trade history
- Side (BUY/SELL), price, size, fees
- Realized P&L per trade

### market_data
- Real-time market snapshots
- Price, volume, liquidity, bid/ask spread
- Indexed for efficient time-series queries

### analytics
- Custom metric storage
- Flexible metadata support
- Timestamped for historical analysis

### price_history
- Token price evolution over time
- Volume tracking
- Unique index prevents duplicates

### correlations
- Pairwise token correlations
- Timeframe-specific calculations
- Automatically updated

### performance_metrics
- Portfolio-level metrics
- Calculated at regular intervals
- Historical performance tracking

## API Rate Limiting

Default: 100 requests per 60 seconds
Configurable via `rateLimit` config option

## WebSocket Features

- Automatic reconnection with exponential backoff
- Ping/pong keepalive mechanism
- Multiple subscription channels
- Graceful disconnection handling

## Notification Channels

### Email
- HTML templates
- Authorization header support
- Customizable sender/recipient

### SMS
- Text message delivery
- Character limit aware

### Push Notifications
- Device-based delivery
- Custom data payload

### Webhooks
- JSON payload delivery
- Optional API key authentication
- Ideal for custom integrations

## Configuration Options

```typescript
interface TradingSystemConfig {
  api: {
    apiKey?: string;
    rateLimit?: { maxRequests: number; windowMs: number };
  };
  database: {
    path: string;
  };
  portfolio: {
    max_position_size?: number;      // Default: 0.20 (20%)
    max_portfolio_risk?: number;     // Default: 0.50 (50%)
    max_correlation?: number;        // Default: 0.70
  };
  websocket: {
    enabled: boolean;
    reconnect?: boolean;
  };
  notifications: {
    user_id: string;
    channels: NotificationChannel[];
  };
}
```

## Best Practices

1. **Always validate market data** before making trading decisions
2. **Set appropriate risk limits** for your portfolio size
3. **Monitor correlation** between positions regularly
4. **Review backtesting results** before deploying strategies
5. **Use sentiment data** as a secondary confirmation signal
6. **Maintain adequate liquidity** in positions
7. **Scale position sizes** based on confidence levels
8. **Set up notifications** for critical risk events

## Advanced Features

### Kelly Criterion
Optimal position sizing based on win probability and odds, with configurable maximum fraction.

### Correlation Matrix
Automatically calculates and caches correlations between all tracked tokens.

### Portfolio Optimization
Gradient-based optimization to maximize Sharpe ratio given expected returns.

### Monte Carlo Simulation
Bootstrap-based simulation to estimate future performance distributions and probability of profit.

## Performance Considerations

- SQLite with WAL mode for concurrent access
- Indexed queries for efficient market data retrieval
- Caching with configurable TTL
- Batch operations for database inserts
- Memory-efficient streaming for large datasets

## Future Enhancements

- Machine learning-based price prediction
- Advanced hedging strategies
- Options pricing and Greeks calculation
- Multi-exchange support
- Advanced order types (stop-loss, limit, etc.)
- Real-time P&L updates
- Mobile app integration
- Advanced charting and analytics UI

## Contributing

Please ensure all code follows TypeScript strict mode and includes proper type annotations.

## License

MIT

## Disclaimer

This trading system is provided for educational purposes. Always conduct thorough testing and due diligence before using in production. Past performance does not guarantee future results. Trading involves substantial risk of loss.
