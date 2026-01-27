import { PoolClient } from 'pg';

/**
 * Migration: Create initial schema
 * Sets up base tables for markets, events, and trades
 */

export const up = async (client: PoolClient): Promise<void> => {
  await client.query(`
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_condition_id (condition_id),
      INDEX idx_market_slug (market_slug),
      INDEX idx_active (active),
      INDEX idx_created_at (created_at)
    );

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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event_slug (event_slug),
      INDEX idx_active (active)
    );

    -- Create orderbook table
    CREATE TABLE IF NOT EXISTS orderbook (
      id SERIAL PRIMARY KEY,
      asset_id VARCHAR(255) NOT NULL,
      bids JSONB,
      asks JSONB,
      mid_price DECIMAL(10, 6),
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_asset_id (asset_id),
      INDEX idx_last_update (last_update)
    );

    -- Create price history table
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      asset_id VARCHAR(255) NOT NULL,
      price DECIMAL(10, 6) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_asset_id (asset_id),
      INDEX idx_timestamp (timestamp),
      UNIQUE(asset_id, timestamp)
    );

    -- Create api_calls table for monitoring
    CREATE TABLE IF NOT EXISTS api_calls (
      id SERIAL PRIMARY KEY,
      endpoint VARCHAR(255) NOT NULL,
      method VARCHAR(10) NOT NULL,
      status_code INT,
      duration_ms INT,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_endpoint (endpoint),
      INDEX idx_status_code (status_code),
      INDEX idx_created_at (created_at)
    );

    -- Create migrations table
    CREATE TABLE IF NOT EXISTS __migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      batch INT DEFAULT 0,
      duration_ms INT,
      INDEX idx_batch (batch),
      INDEX idx_executed_at (executed_at)
    );
  `);
};

export const down = async (client: PoolClient): Promise<void> => {
  await client.query(`
    DROP TABLE IF EXISTS __migrations;
    DROP TABLE IF EXISTS api_calls;
    DROP TABLE IF EXISTS price_history;
    DROP TABLE IF EXISTS orderbook;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS markets;
  `);
};

export default { up, down };
