# Docker Setup Guide

This guide explains how to run the Polymarket Agent using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.29+
- 2GB RAM minimum
- 500MB disk space

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Clone environment variables
cp .env.example .env

# Edit .env with your settings
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
```

### 2. Verify Services

```bash
# Check service status
docker-compose ps

# Test API health
curl http://localhost:3000/health

# Check database connection
docker-compose exec postgres psql -U polymarket -d polymarket_dev -c "SELECT 1"
```

## Configuration

### Environment Variables

Create or edit `.env` file:

```env
# Node environment
NODE_ENV=production
PORT=3000

# Database
DB_USER=polymarket
DB_PASSWORD=your_secure_password_here
DB_NAME=polymarket_prod
DB_PORT=5432

# API Keys
POLYMARKET_API_KEY=your_api_key_here
POLYMARKET_PRIVATE_KEY=your_private_key_here

# Logging
LOG_LEVEL=INFO
```

### Docker Compose Services

- **postgres**: PostgreSQL database (port 5432)
- **api**: Node.js application (port 3000)
- **redis**: Redis cache (port 6379, optional)
- **prometheus**: Metrics collection (port 9090, optional)

## Building Images

### Build for Production

```bash
# Build image with specific tag
docker build -t polymarket-api:1.0.0 .

# Build with build arguments
docker build \
  --build-arg NODE_ENV=production \
  -t polymarket-api:latest .
```

### Multi-Architecture Build

```bash
# Build for multiple architectures (requires buildx)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t polymarket-api:latest \
  --push .
```

## Running Containers

### Start Individual Services

```bash
# Start just the database
docker-compose up -d postgres

# Start API with database
docker-compose up -d postgres api

# Start with all optional services
docker-compose up -d
```

### Custom Commands

```bash
# Run migrations
docker-compose exec api npm run migrate

# Run tests in container
docker-compose exec api npm run test:run

# Access API shell
docker-compose exec api sh
```

## Monitoring

### Health Check

```bash
# Check API health
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "uptime": 1234,
#   "memory": "45%"
# }
```

### Metrics

```bash
# View Prometheus metrics
curl http://localhost:3000/metrics

# Access Prometheus UI
# http://localhost:9090

# Query metrics
# - http_requests_total
# - db_operation_duration_ms
# - cache_operations_total
```

### Logs

```bash
# View logs from all services
docker-compose logs

# View logs from specific service
docker-compose logs api

# Follow logs in real-time
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 api
```

## Persistence

### Database

- PostgreSQL data is stored in `postgres_data` volume
- Survives container restarts
- Backup with: `docker-compose exec postgres pg_dump -U polymarket polymarket_dev > backup.sql`

### Cache

- Redis data is stored in `redis_data` volume
- Survives container restarts

### Logs

- Application logs in `./logs` directory
- Mounted from container

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Common issues:
# - Port already in use: Change PORT in .env
# - Database connection: Verify DB_PASSWORD and wait for postgres to be ready
# - Missing API keys: Check .env file
```

### Database Connection Issues

```bash
# Test connection manually
docker-compose exec postgres psql -U polymarket -d polymarket_dev

# If connection fails:
# 1. Verify postgres is running: docker-compose ps
# 2. Check DATABASE_URL in .env
# 3. Verify credentials in docker-compose.yml
```

### Health Check Failures

```bash
# Check API status
docker-compose logs api

# Manually test health endpoint
curl -v http://localhost:3000/health

# Check container resources
docker stats

# If running out of memory, adjust limits in docker-compose.yml
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check container logs for errors
docker-compose logs api

# Profile startup time
time curl http://localhost:3000/health

# Increase resources in docker-compose.yml if needed
```

## Cleaning Up

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (careful - deletes data!)
docker-compose down -v

# Remove unused images
docker image prune

# Remove all stopped containers
docker container prune

# Full cleanup (use with caution)
docker system prune -a
```

## Security Considerations

1. **Don't commit .env files** to version control
2. **Use strong passwords** for database
3. **Rotate API keys** regularly
4. **Run as non-root** user (done by default)
5. **Use secrets** in production:
   ```bash
   docker-compose exec -e DATABASE_URL=<secret> api npm start
   ```
6. **Enable firewall rules** to restrict port access
7. **Use HTTPS** in production with reverse proxy

## Production Deployment

### Recommendations

1. Use orchestration (Kubernetes, Docker Swarm)
2. Set resource limits
3. Configure health checks
4. Use external monitoring (Datadog, New Relic)
5. Set up log aggregation (ELK, Splunk)
6. Use container registry (Docker Hub, ECR, GCR)
7. Implement CI/CD for automated deployments

### Resource Limits

```yaml
# Example in docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

## Examples

### Development Setup

```bash
# Start with development settings
NODE_ENV=development \
LOG_LEVEL=DEBUG \
docker-compose up -d
```

### Production Setup

```bash
# Start with production settings
NODE_ENV=production \
LOG_LEVEL=WARN \
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Custom Network

```bash
# Create custom network
docker network create polymarket-net

# Run services on custom network
docker-compose -f docker-compose.yml \
  --project-name polymarket \
  up -d
```

## Advanced Topics

### Multi-Container Deployment

See `docker-compose.yml` for full service configuration.

### Health Checks

All services include health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "--fail", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### Auto-Restart

Services automatically restart on failure:

```yaml
restart: unless-stopped
```

## Support

For issues:

1. Check logs: `docker-compose logs`
2. Verify configuration: Check `.env` file
3. Test connectivity: `curl http://localhost:3000/health`
4. Review documentation: Check DEPLOYMENT_GUIDE.md
5. Report issues with logs and configuration

---

**Last Updated:** 2026-01-27  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
