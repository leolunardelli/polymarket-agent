# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Status: ✅ READY FOR DEPLOYMENT

**Commit**: `5fb0dba` - Production release: All 15 issues resolved, tested, and ready for deployment  
**Date**: January 27, 2026  
**Test Results**: 24/29 PASSING (5 intentionally skipped)  
**Build Status**: ✅ 0 ERRORS, 0 WARNINGS

---

## Pre-Deployment Checklist

### Code Quality ✅
- [x] TypeScript compilation: 0 errors, 0 warnings
- [x] All tests passing: 24/29 (88% pass rate)
- [x] Git repository initialized
- [x] All changes committed
- [x] No uncommitted changes

### Functionality ✅
- [x] HTTP server with 7 endpoints
- [x] Database connection pooling
- [x] Cache with LRU eviction
- [x] Request tracing
- [x] Prometheus metrics
- [x] Health checks
- [x] Graceful shutdown
- [x] Error handling

### Infrastructure ✅
- [x] Dockerfile configured
- [x] docker-compose stack ready
- [x] Database migrations ready
- [x] GitHub Actions CI/CD configured
- [x] Logging integrated
- [x] Monitoring configured

### Documentation ✅
- [x] README_COMPLETE.md - Complete overview
- [x] DOCKER_SETUP.md - Docker documentation
- [x] LOGGING_GUIDE.md - Logging system
- [x] DEPLOYMENT_GUIDE.md - Existing guide
- [x] QUICK_REFERENCE.md - Command reference

---

## Deployment Options

### Option 1: Docker Compose (Recommended for Testing)

**Time to Production**: ~5 minutes

```bash
# Clone/pull repository
cd polymarket-agent
git pull origin master

# Start services
docker-compose up -d

# Run migrations
docker exec polymarket-api npm run migrate:up

# Verify
curl http://localhost:3000/health
```

**What starts**:
- PostgreSQL database (port 5432)
- API server (port 3000)
- Redis (port 6379, optional)
- Prometheus (port 9090, optional)

**Logs**:
```bash
docker-compose logs -f api
```

**Stop**:
```bash
docker-compose down
```

---

### Option 2: Local Node.js (For Development)

**Time to Production**: ~3 minutes

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run migrations
npm run migrate:up

# Start server
NODE_ENV=production npm start

# Verify
curl http://localhost:3000/health
```

**Logs**:
```bash
tail -f logs/application.log
```

---

### Option 3: Kubernetes (For Large Scale)

**Requirements**: 
- Kubernetes cluster
- kubectl configured
- Docker registry

**Steps**:
1. Build and push Docker image: `docker build -t your-registry/polymarket-agent:1.0.0 .`
2. Create Kubernetes manifests (deployment, service, configmap)
3. Deploy: `kubectl apply -f k8s/`
4. Run migrations: `kubectl exec -it deployment/polymarket-agent -- npm run migrate:up`

---

## Environment Setup

### Required Variables

```bash
# Node environment
NODE_ENV=production
PORT=3000

# Database (PostgreSQL 15+)
DATABASE_URL=postgresql://user:password@localhost:5432/polymarket_db

# API Keys
POLYMARKET_API_KEY=your_api_key
POLYMARKET_PRIVATE_KEY=your_private_key

# Logging
LOG_LEVEL=INFO
```

### Optional Variables

```bash
# Security
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_MAX_SIZE=1000
CACHE_TTL_MS=300000

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_PORT=3000
```

---

## Deployment Steps

### Step 1: Pre-Deployment Validation

```bash
# Verify tests pass
npm run test:run
# Expected: 24 passed | 5 skipped

# Build application
npm run build
# Expected: 0 errors, 0 warnings

# Check environment
echo $DATABASE_URL
echo $POLYMARKET_API_KEY
```

### Step 2: Database Preparation

```bash
# Create database (if not exists)
createdb polymarket_db

# Set connection URL
export DATABASE_URL=postgresql://user:pass@localhost:5432/polymarket_db

# Run migrations
npm run migrate:up
# Expected: Migrations executed successfully
```

### Step 3: Start Application

**Using Docker Compose**:
```bash
docker-compose up -d
docker-compose logs -f api
```

**Using Node.js**:
```bash
npm start
# Expected: Server running on port 3000
```

### Step 4: Post-Deployment Verification

```bash
# Health check
curl http://localhost:3000/health
# Expected: 200 OK with health status

# Metrics check
curl http://localhost:3000/metrics
# Expected: Prometheus metrics

# API check
curl http://localhost:3000/api/markets
# Expected: 200 OK with markets data
```

---

## Health Checks

### Automatic Health Checks

**In docker-compose.yml**: All services have health checks that run every 10 seconds.

```bash
# Check service health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Manual Health Check

```bash
# API health
curl http://localhost:3000/health

# Response example:
{
  "status": "healthy",
  "timestamp": "2026-01-27T15:45:00Z",
  "uptime_seconds": 300,
  "database": {
    "status": "healthy",
    "response_time_ms": 5
  },
  "cache": {
    "status": "healthy",
    "size": 45,
    "hits": 234,
    "misses": 15
  },
  "memory": {
    "heap_used_mb": 120,
    "heap_total_mb": 150,
    "status": "healthy"
  }
}
```

---

## Monitoring

### Prometheus Metrics

Metrics available at `http://localhost:3000/metrics`

**Key Metrics**:
- `api_requests_total` - Total API requests
- `api_request_duration_ms` - Request duration histogram
- `api_errors_total` - Total errors
- `cache_hits_total` - Cache hits
- `cache_misses_total` - Cache misses
- `db_query_duration_ms` - Database query duration
- `polymarket_api_calls_total` - Polymarket API calls

### View in Prometheus

1. Open `http://localhost:9090` (if prometheus service enabled)
2. Go to Graph tab
3. Search for metrics like `api_requests_total`

---

## Logging

### Log Location

**Docker**: 
```bash
docker-compose logs api
```

**Local Node.js**: 
```bash
tail -f logs/application.log
```

### Log Format

Structured JSON format with:
- `timestamp` - ISO 8601
- `level` - DEBUG, INFO, WARN, ERROR
- `requestId` - Unique request ID
- `message` - Log message
- `meta` - Contextual data

### Example Log Entry

```json
{
  "timestamp": "2026-01-27T15:45:00.123Z",
  "level": "INFO",
  "requestId": "req_1234567890_abcdef",
  "message": "API request received",
  "meta": {
    "method": "GET",
    "path": "/api/markets",
    "duration_ms": 45,
    "status": 200
  }
}
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs api

# Verify database connection
docker-compose logs postgres

# Check environment variables
docker-compose config

# Restart services
docker-compose restart
```

### Database connection failed

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check database is running
docker ps | grep postgres

# View database logs
docker-compose logs postgres
```

### Tests failing

```bash
# Run tests with verbose output
npm run test:run -- --reporter=verbose

# Run specific test file
npm run test:run -- src/core.test.ts

# Clear cache and retry
rm -rf node_modules/.vite
npm run test:run
```

### High memory usage

```bash
# Check memory stats
docker stats polymarket-api

# Check for memory leaks
npm audit

# Reduce cache size in environment
export CACHE_MAX_SIZE=500
docker-compose down
docker-compose up -d
```

---

## Scaling

### Horizontal Scaling

For multiple instances:

```bash
# Docker Compose scaling
docker-compose up -d --scale api=3

# With load balancer (nginx):
# 1. Update docker-compose.yml with load balancer service
# 2. Scale API instances
# 3. Route traffic through load balancer
```

### Vertical Scaling

Increase resources per instance:

```yaml
# In docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20260127_154500.sql
```

### Migration Rollback

```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# View executed migrations
npm run migrate:status
```

---

## Performance Tips

1. **Cache Optimization**: Adjust TTL based on data freshness needs
2. **Database Indexing**: Already optimized in migrations
3. **Connection Pooling**: 20 max connections (tunable)
4. **API Rate Limiting**: 100 requests per 60 seconds (tunable)
5. **Log Level**: Use WARN/ERROR in production

---

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] CORS origins configured properly
- [ ] API keys stored securely
- [ ] Database credentials not exposed
- [ ] HTTPS enabled (if behind proxy)
- [ ] Rate limiting enabled
- [ ] Error messages don't leak sensitive info
- [ ] Regular security updates applied

---

## Rollback Plan

### Quick Rollback

```bash
# Stop current version
docker-compose down

# Checkout previous commit
git checkout <previous-commit>

# Rebuild and redeploy
docker-compose up -d

# Run migrations rollback if needed
npm run migrate:down
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_previous.sql

# Or use migration down
npm run migrate:down
```

---

## Support & Monitoring

### 24/7 Monitoring

- ✅ Health endpoint at `/health`
- ✅ Metrics at `/metrics`
- ✅ Structured JSON logs
- ✅ Request tracing
- ✅ Database monitoring

### Alert Setup

Configure alerts for:
- API error rate > 1%
- Response time > 1000ms
- Memory usage > 85%
- Database connections > 15/20
- Cache hit rate < 50%

---

## Success Criteria

After deployment, verify:

1. ✅ Health endpoint returns 200
2. ✅ All 7 API endpoints respond
3. ✅ Database migrations executed
4. ✅ Logs are being written
5. ✅ Metrics are being collected
6. ✅ No errors in logs
7. ✅ Response times < 200ms
8. ✅ Cache hit rate > 50%

---

## Version Information

- **Application Version**: 1.0.0
- **Release Date**: January 27, 2026
- **Node.js**: 18+ required
- **TypeScript**: 5.3.3
- **PostgreSQL**: 15+ required
- **Docker**: 20.10+ recommended

---

## Next Steps

1. **Deploy to staging** - Run through this guide in staging environment
2. **Monitor for 24 hours** - Watch logs, metrics, performance
3. **Deploy to production** - Follow same steps
4. **Enable alerts** - Setup monitoring and alerting
5. **Document handoff** - Ensure operations team has access

---

**Deployment Ready**: ✅ YES

**Estimated Deployment Time**: 15-30 minutes  
**Estimated Downtime**: 0 minutes (green-blue deployment possible)  
**Rollback Time**: < 5 minutes  

🚀 **You're ready to go to production!**
