# Comprehensive Logging Guide

This document describes the complete logging system for the Polymarket Agent.

## Overview

The application uses structured JSON logging for all components:

- **Structured Format**: JSON-based logs with consistent schema
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Request Tracing**: Unique requestId for request correlation
- **Metrics Integration**: Performance tracking
- **Environment-based**: Log level configurable via NODE_ENV and LOG_LEVEL

## Log Format

All logs follow this structure:

```json
{
  "timestamp": "2026-01-27T15:34:28.365Z",
  "level": "INFO",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "Request completed",
  "meta": {
    "method": "GET",
    "path": "/api/markets",
    "statusCode": 200,
    "duration": 125,
    "traceId": "trace-abc123"
  }
}
```

## Components

### 1. Request Logging

**Logger**: `src/logger.ts`

```typescript
logger.info('Request started', {
  method: req.method,
  path: req.path,
  ip: req.ip,
});
```

**Output**:
```json
{
  "timestamp": "2026-01-27T15:34:28.000Z",
  "level": "INFO",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "Request started",
  "meta": {
    "method": "GET",
    "path": "/api/markets",
    "ip": "127.0.0.1"
  }
}
```

### 2. Database Logging

**Logger**: `src/database.ts`, `src/monitoring.ts`

```typescript
recordDatabaseMetrics('SELECT', duration, rows, success);
```

**Log Entries**:
- Query execution time
- Rows affected
- Connection pool status
- Retry attempts

```json
{
  "timestamp": "2026-01-27T15:34:28.050Z",
  "level": "INFO",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "Query executed",
  "meta": {
    "query": "SELECT * FROM markets",
    "duration": 45,
    "rows": 10,
    "success": true
  }
}
```

### 3. API Call Logging

**Logger**: `src/polymarket-api.ts`, `src/monitoring.ts`

```typescript
recordAPIMetrics(endpoint, duration, statusCode, retries);
```

**Log Entries**:
- Request URL and method
- Response status code
- Response time
- Retry attempts
- Cache hits/misses

```json
{
  "timestamp": "2026-01-27T15:34:28.100Z",
  "level": "INFO",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "API call completed",
  "meta": {
    "endpoint": "https://gamma-api.polymarket.com/markets",
    "method": "GET",
    "statusCode": 200,
    "duration": 125,
    "retries": 1,
    "cached": false
  }
}
```

### 4. Cache Logging

**Logger**: `src/cache.ts`, `src/monitoring.ts`

```typescript
recordCacheMetrics(operation, hit);
```

**Log Entries**:
- Cache operations (get, set, delete)
- Hit/miss rates
- Eviction events
- TTL expiration

```json
{
  "timestamp": "2026-01-27T15:34:28.120Z",
  "level": "INFO",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "Cache operation",
  "meta": {
    "operation": "get",
    "key": "markets:list",
    "hit": true,
    "duration": 2
  }
}
```

### 5. Error Logging

**Logger**: All modules

```typescript
logger.error('Operation failed', {
  error: error.message,
  stack: error.stack,
  context: additionalInfo,
});
```

**Log Entries**:
- Exception messages
- Stack traces
- Error context
- Recovery attempts

```json
{
  "timestamp": "2026-01-27T15:34:28.200Z",
  "level": "ERROR",
  "requestId": "req_1769528067328_hypvl9s",
  "message": "API call failed",
  "meta": {
    "error": "Connection timeout",
    "url": "https://gamma-api.polymarket.com/markets",
    "attempt": 3,
    "retryable": true
  }
}
```

### 6. Health Check Logging

**Logger**: `src/health.ts`

```json
{
  "timestamp": "2026-01-27T15:34:28.300Z",
  "level": "INFO",
  "requestId": "req_1769528067328_healthcheck",
  "message": "Health check completed",
  "meta": {
    "status": "healthy",
    "database": "connected",
    "memory": "45%",
    "uptime": 3600,
    "checks": {
      "database": { "status": "ok", "responseTime": 10 },
      "memory": { "status": "ok", "usage": "45%" },
      "cache": { "status": "ok", "size": 1024 }
    }
  }
}
```

## Configuration

### Log Level

Set via environment variables:

```bash
# Development (all logs)
LOG_LEVEL=DEBUG

# Production (important logs only)
LOG_LEVEL=WARN

# Default
LOG_LEVEL=INFO
```

### Output Destinations

By default, logs go to:
- **stdout**: All logs printed to console
- **Files**: Optional file rotation (configure in production)

### Request ID Tracking

Every request gets a unique ID:
```
req_<timestamp>_<random>
```

This ID is included in all logs and response headers for correlation.

## Usage Examples

### 1. Log Request Information

```typescript
logger.info('Processing market update', {
  marketId: market.id,
  marketName: market.question,
  priceChange: percentChange,
});
```

### 2. Log API Calls

```typescript
logger.debug('Fetching markets from API', {
  url: endpoint,
  limit: 100,
  offset: 0,
});
```

### 3. Log Errors with Context

```typescript
try {
  await database.query(sql);
} catch (error) {
  logger.error('Database query failed', {
    query: sql,
    error: error.message,
    parameters: params,
  });
}
```

### 4. Log Performance Metrics

```typescript
const startTime = Date.now();
const result = await operation();
const duration = Date.now() - startTime;

logger.info('Operation completed', {
  duration,
  resultSize: result.length,
});
```

## Log Levels

### DEBUG
- Detailed information for debugging
- Variable values
- Function entry/exit
- Detailed trace information

**Usage**:
```typescript
logger.debug('Variable state', { userId, status, data });
```

### INFO
- General informational messages
- Business operations
- Completed requests
- Successful API calls

**Usage**:
```typescript
logger.info('Order executed', { orderId, price, quantity });
```

### WARN
- Warning conditions
- Deprecation notices
- Performance issues
- Retried operations

**Usage**:
```typescript
logger.warn('Slow query detected', { duration: 5000, query });
```

### ERROR
- Error conditions
- Exceptions
- Failed operations
- Critical issues

**Usage**:
```typescript
logger.error('Critical operation failed', { error: error.message });
```

## Monitoring & Analysis

### View Recent Logs

```bash
# Last 50 lines
tail -f logs/application.log | head -50

# Follow in real-time
tail -f logs/application.log
```

### Filter by Log Level

```bash
# Errors only
grep '"level":"ERROR"' logs/application.log

# Warnings and errors
grep -E '"level":"(WARN|ERROR)"' logs/application.log
```

### Filter by Request ID

```bash
# All logs for specific request
grep 'req_1769528067328_hypvl9s' logs/application.log
```

### Search for Specific Message

```bash
# Find all database errors
grep -i 'database' logs/application.log | grep ERROR

# Find all timeouts
grep 'timeout' logs/application.log
```

## Production Best Practices

1. **Set LOG_LEVEL=WARN** to reduce noise
2. **Aggregate logs** to centralized system:
   - ELK Stack
   - Datadog
   - CloudWatch
   - Splunk
3. **Set up alerts** for ERROR logs
4. **Monitor request duration** for performance
5. **Correlate logs** using requestId
6. **Rotate log files** daily
7. **Archive old logs** after 30 days

## Integration Points

### Server Startup
```typescript
logger.info('Server starting', {
  port: 3000,
  environment: 'production',
  version: '1.0.0',
});
```

### API Client
```typescript
recordAPIMetrics(endpoint, duration, statusCode);
```

### Database Operations
```typescript
recordDatabaseMetrics(operation, duration, rows, success);
```

### Cache Operations
```typescript
recordCacheMetrics(operation, hit);
```

### Error Handling
```typescript
logger.error('Unhandled error', {
  error: error.message,
  stack: error.stack,
});
```

## Troubleshooting

### Logs Not Appearing

1. Check LOG_LEVEL is correct
2. Verify logger is imported
3. Check requestId is set
4. Ensure output is not buffered

### Too Many Logs

1. Increase LOG_LEVEL to WARN or ERROR
2. Remove DEBUG logs from hot paths
3. Check for logging loops

### Logs Not Correlating

1. Verify requestId is passed consistently
2. Check request ID middleware runs first
3. Ensure requestId header is included

## Examples

See example log files in `logs/examples/` for complete output samples.

---

**Last Updated:** 2026-01-27  
**Version:** 1.0.0  
**Status:** ✅ Complete
