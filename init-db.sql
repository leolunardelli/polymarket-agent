-- Create markets table
CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(255) UNIQUE NOT NULL,
  question VARCHAR(1024) NOT NULL,
  description TEXT,
  market_slug VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  closed BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  accepting_orders BOOLEAN DEFAULT true,
  end_date_iso TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for markets
CREATE INDEX IF NOT EXISTS idx_markets_condition_id ON markets(condition_id);
CREATE INDEX IF NOT EXISTS idx_markets_market_slug ON markets(market_slug);
CREATE INDEX IF NOT EXISTS idx_markets_active ON markets(active);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT,
  start_date_iso TIMESTAMP,
  end_date_iso TIMESTAMP,
  active BOOLEAN DEFAULT true,
  closed BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_event_slug ON events(event_slug);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);

-- Create orderbook table
CREATE TABLE IF NOT EXISTS orderbook (
  id SERIAL PRIMARY KEY,
  asset_id VARCHAR(255) NOT NULL,
  bids JSONB,
  asks JSONB,
  mid_price DECIMAL(10, 6),
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for orderbook
CREATE INDEX IF NOT EXISTS idx_orderbook_asset_id ON orderbook(asset_id);
CREATE INDEX IF NOT EXISTS idx_orderbook_last_update ON orderbook(last_update);

-- Create price history table
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  asset_id VARCHAR(255) NOT NULL,
  price DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asset_id, timestamp)
);

-- Create indexes for price_history
CREATE INDEX IF NOT EXISTS idx_price_history_asset_id ON price_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);

-- Create api_calls table for monitoring
CREATE TABLE IF NOT EXISTS api_calls (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for api_calls
CREATE INDEX IF NOT EXISTS idx_api_calls_endpoint ON api_calls(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_calls_status_code ON api_calls(status_code);
CREATE INDEX IF NOT EXISTS idx_api_calls_created_at ON api_calls(created_at);

-- Create migrations table
CREATE TABLE IF NOT EXISTS __migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  batch INT DEFAULT 0,
  duration_ms INT
);

-- Create indexes for __migrations
CREATE INDEX IF NOT EXISTS idx_migrations_batch ON __migrations(batch);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON __migrations(executed_at);
