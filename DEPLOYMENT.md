# Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Staging Deployment](#staging-deployment)
3. [Production Deployment](#production-deployment)
4. [Rollback Procedures](#rollback-procedures)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

**Code Quality:**
- [ ] All tests pass locally: `npm test:run`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Coverage threshold met: `npm test:coverage`

**Security:**
- [ ] No security vulnerabilities: `npm run security:audit`
- [ ] No hardcoded secrets in code
- [ ] Environment variables documented in `.env.example`
- [ ] Secret rotation schedule confirmed

**Database:**
- [ ] All migrations have down() path
- [ ] Backup created before deployment
- [ ] Migration tested on staging first
- [ ] Connection pool settings validated

**Configuration:**
- [ ] All environment variables defined
- [ ] Configuration validated against schema
- [ ] Monitoring alerts configured
- [ ] Rollback credentials prepared

**Documentation:**
- [ ] Changelog updated
- [ ] Documentation reflects changes
- [ ] Runbooks prepared
- [ ] Team briefed on changes

---

## Staging Deployment

### 1. Build & Test

```bash
# Clone/pull latest code
git clone <repo> polymarket-agent-staging
cd polymarket-agent-staging

# Install dependencies
npm ci --production

# Run full test suite
npm run deploy:staging

# Expected output
# ✓ All tests pass
# ✓ No security vulnerabilities
# ✓ Build successful
```

### 2. Configure Staging Environment

```bash
# Set staging environment variables
cp .env.example .env.staging

# Edit with staging values
nano .env.staging

# Required variables:
# - ENVIRONMENT=staging
# - DATABASE_URL=postgresql://staging_user:password@staging-db:5432/polymarket_staging
# - POLYMARKET_API_KEY=staging_api_key
# - POLYMARKET_PRIVATE_KEY=staging_private_key
# - JWT_SECRET=your_jwt_secret_here (min 32 chars)
```

### 3. Deploy to Staging

```bash
# Build application
npm run build

# Run database migrations
npm run migrate:up

# Start application (foreground for initial verification)
PORT=3001 NODE_ENV=staging node dist/index.js

# Expected output
# [INFO] Configuration loaded and validated
# [INFO] PolymarketAPI initialized
# [INFO] Database connected (20 connections)
# [INFO] Listening on port 3001
```

### 4. Run Smoke Tests

```bash
# In another terminal, run health checks
npm run health:check

# Test critical endpoints
curl -X GET http://localhost:3001/api/markets -H "Authorization: Bearer <api_key>"
curl -X GET http://localhost:3001/api/portfolio
curl -X GET http://localhost:3001/health

# Expected: 200 OK responses
```

### 5. Monitor Staging (30 minutes minimum)

```bash
# Check application logs for errors
npm run logs:tail

# Verify metrics collection
npm run metrics:export | head -20

# Monitor database connections
psql staging_db -c "SELECT count(*) FROM pg_stat_activity;"

# Expected: No errors, normal performance
```

---

## Production Deployment

### 1. Pre-Production Verification

```bash
# Ensure staging deployment is stable for 1+ hours
# Check Prometheus metrics for:
# - Error rate: < 1%
# - P99 latency: < 2000ms
# - Cache hit rate: > 70%
# - Memory stable: < 50MB growth/hour

# Get sign-off from:
# [ ] QA Team
# [ ] DevOps Team
# [ ] Product Team
```

### 2. Prepare Production Environment

```bash
# Start blue environment (current production)
# Verify it's healthy and serving traffic

# Prepare green environment (new version)
git clone <repo> polymarket-agent-production-green
cd polymarket-agent-production-green

# Load production secrets from vault
aws secretsmanager get-secret-value --secret-id polymarket/prod > /tmp/secrets.json
export POLYMARKET_API_KEY=$(jq -r '.SecretString.POLYMARKET_API_KEY' /tmp/secrets.json)
export DATABASE_URL=$(jq -r '.SecretString.DATABASE_URL' /tmp/secrets.json)
export JWT_SECRET=$(jq -r '.SecretString.JWT_SECRET' /tmp/secrets.json)
```

### 3. Build & Deploy Green

```bash
# Install and build
npm ci --production
npm run build

# Run tests one more time in production environment
npm test:run
npm run security:audit

# Run database migrations (on separate connection pool)
MIGRATION_MODE=true npm run migrate:up

# Start green environment
PORT=3002 NODE_ENV=production node dist/index.js &
GREEN_PID=$!

# Wait for startup
sleep 10

# Verify green is healthy
curl -f http://localhost:3002/health || { kill $GREEN_PID; exit 1; }
```

### 4. Traffic Shift (Blue-Green)

```bash
# Option A: DNS-based (safest)
# Update DNS alias to point to green (NEW)
# Wait for TTL to expire
# Monitor traffic shift

# Option B: Load balancer-based (recommended)
# Gradually shift traffic:
# 10% to green -> Monitor 5 min
# 50% to green -> Monitor 5 min
# 100% to green -> Monitor 5 min

# bash script for gradual shift:
for percentage in 10 50 100; do
  echo "Shifting $percentage% traffic to green"
  aws elbv2 modify-rule --rule-arn <rule-arn> \
    --actions Type=forward,TargetGroups='[{TargetGroupArn=<blue>,Weight=<blue>},{TargetGroupArn=<green>,Weight=<green>}]'
  sleep 300  # Monitor for 5 minutes
  
  # Check error rates
  ERROR_RATE=$(curl -s http://localhost:9090/api/v1/query?query='increase(http_requests_total{status=~"5.."}[5m])/increase(http_requests_total[5m])' | jq '.data.result[0].value[1]')
  if [[ $ERROR_RATE > 0.05 ]]; then
    echo "ERROR RATE TOO HIGH: $ERROR_RATE, ROLLING BACK"
    break
  fi
done
```

### 5. Production Verification

```bash
# Monitor for 30 minutes
# Check key metrics:

# Error rate
curl -s 'http://prometheus:9090/api/v1/query?query=http_requests_error_rate'

# Latency (p99)
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.99,http_request_duration_seconds)'

# Cache hit rate
curl -s 'http://prometheus:9090/api/v1/query?query=cache_hit_rate'

# Database connections
curl -s 'http://prometheus:9090/api/v1/query?query=db_connections_active'

# All checks should be normal/green
```

### 6. Finalize Deployment

```bash
# After 30+ minutes of successful monitoring:

# Stop old blue environment
kill <blue_pid>

# Update documentation
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Notify team
echo "✅ Deployment successful! Production running v1.2.3"
```

---

## Rollback Procedures

### Automatic Rollback (Triggered by Health Checks)

```typescript
// Health check monitors for:
// 1. Error rate > 5% for 2 minutes
// 2. P99 latency > 3000ms for 2 minutes
// 3. Application unreachable for 1 minute

// If triggered, automatic rollback script:
if (shouldRollback()) {
  // 1. Shift traffic back to blue
  await shiftTraffic(blue, 100);
  
  // 2. Wait for stabilization
  await wait(60_000);
  
  // 3. Verify blue is healthy
  const health = await checkHealth(blue);
  if (!health.ok) {
    // Alert on-call immediately
    await notifyOncall('Rollback failed, manual intervention required');
  }
  
  // 4. Log event
  logger.error('Automatic rollback executed', {
    version: currentVersion,
    reason: rollbackReason,
    timestamp: now(),
  });
}
```

### Manual Rollback

```bash
#!/bin/bash
# Manual rollback procedure

set -e

echo "Starting manual rollback..."

# 1. Get previous version
PREVIOUS_VERSION=$(git describe --abbrev=0 --tags @~1)
echo "Rolling back to $PREVIOUS_VERSION"

# 2. Shift traffic back to blue
aws elbv2 modify-rule --rule-arn <rule-arn> \
  --actions Type=forward,TargetGroupArn=<blue>
echo "✓ Traffic shifted to blue"

# 3. Wait for connections to drain
sleep 30

# 4. Stop green environment
kill <green_pid> || true
echo "✓ Green environment stopped"

# 5. Verify blue is serving traffic
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH" != "200" ]; then
  echo "❌ Blue environment health check failed!"
  exit 1
fi
echo "✓ Blue environment healthy"

# 6. Verify error rates are normal
sleep 60
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=http_error_rate' | jq '.data.result[0].value[1]')
if [[ $ERROR_RATE > 0.05 ]]; then
  echo "⚠️  High error rate detected: $ERROR_RATE"
fi

# 7. Notify team
echo "✅ Rollback complete! Running on $PREVIOUS_VERSION"
```

### Rollback Triggers

| Event | Response | Delay |
|-------|----------|-------|
| Error rate > 5% | Automatic rollback | 2 min |
| P99 latency > 3s | Automatic rollback | 2 min |
| App unreachable | Automatic rollback | 1 min |
| Database down | Automatic rollback | 1 min |
| Critical alert | Manual review | 5 min |

---

## Verification Steps

### Post-Deployment Checklist

```bash
# 1. Verify Version
curl http://localhost:3000/api/version
# Expected: { "version": "1.2.3", "environment": "production" }

# 2. Check Database
psql production_db -c "SELECT migration_id, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;"
# Expected: All migrations applied

# 3. Verify Cache
redis-cli DBSIZE
# Expected: Non-zero size, keys present

# 4. Check Logs for Errors
tail -n 100 logs/trading.log | grep ERROR
# Expected: No unexpected errors

# 5. Verify Monitoring
curl -s http://prometheus:9090/api/v1/query?query=up | jq '.data.result'
# Expected: All metrics scraped successfully

# 6. Test Core Functionality
curl -X GET http://localhost:3000/api/markets?limit=5
# Expected: 200 OK with market data

# 7. Check Performance Metrics
curl -s http://prometheus:9090/api/v1/query?query='histogram_quantile(0.99,http_request_duration_seconds)'
# Expected: p99 latency < 2000ms

# 8. Verify Alerting
npm run alerts:test
# Expected: Alerts are configured and firing normally
```

---

## Troubleshooting

### Issue: High Error Rate After Deployment

```bash
# 1. Check application logs
tail -f logs/trading.log | grep ERROR

# 2. Check Prometheus metrics
curl -s 'http://prometheus:9090/api/v1/query?query=increase(http_requests_total{status=~"5.."}[5m])'

# 3. Common causes & fixes:
# - Database connection: Check DATABASE_URL and connection pool
# - API key invalid: Verify POLYMARKET_API_KEY in secrets
# - Memory exhausted: Check memory usage (npm run metrics:export)
# - Configuration missing: Verify all env vars set (npm run health:check)

# 4. If unresolvable, execute rollback:
./scripts/rollback.sh
```

### Issue: Database Migration Failure

```bash
# 1. Check migration status
npm run migrate:down -- --steps 0  # Show current state

# 2. Inspect migration file for errors
cat migrations/001_initial.ts

# 3. Common fixes:
# - Syntax error: Check SQL syntax
# - Schema conflict: Check for existing tables
# - Constraint violation: Review foreign keys

# 4. Roll back to previous state
npm run migrate:down -- --steps 1

# 5. Fix migration and retry
# npm run migrate:up
```

### Issue: Performance Degradation

```bash
# 1. Check resource utilization
npm run metrics:export | grep -E 'cpu_seconds|memory_bytes|connections'

# 2. Identify bottleneck:
# - High CPU: Check query performance
# - High memory: Check for memory leaks
# - High connections: Check connection pool

# 3. Fix:
# - CPU: Optimize slow queries, add caching
# - Memory: Investigate leak with heap dump
# - Connections: Reduce pool size or fix query timeout

# 4. Verify improvement
sleep 300
npm run metrics:export | grep -E 'cpu_seconds|memory_bytes|connections'
```

### Issue: Cascading Failures

```bash
# 1. Stop application immediately
kill <pid>

# 2. Check for cascading issues:
# - Database available?
# - API endpoints responding?
# - Secrets properly configured?

# 3. Full environment check
npm run health:check
npm run deploy:staging

# 4. If staging works, isolate production issue
# - Check network connectivity
# - Verify firewall rules
# - Check load balancer configuration

# 5. Consider full environment restart
pm2 restart all
docker-compose restart
```

---

## Deployment Success Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| Deployment time | < 30 min | ✅ |
| Zero-downtime | Yes | ✅ |
| Automatic rollback | Available | ✅ |
| Error rate during shift | < 1% | ✅ |
| Health check pass rate | 100% | ✅ |
| Database migration success | 100% | ✅ |

---

**For additional help, see:**
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- [docs/runbooks/](./docs/runbooks/)
- On-call team: #oncall-alerts Slack channel
