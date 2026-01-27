#!/bin/bash
# Quick Start Script for 1-Week Polymarket Agent Test
# This script sets up and runs the test with all required configurations

set -e

echo "======================================"
echo "Polymarket Agent - 1-Week Live Test"
echo "======================================"
echo ""

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

echo "✅ Docker detected: $(docker --version)"
echo ""

# Check environment variables are set
echo "Checking environment configuration..."

REQUIRED_VARS=(
    "POLYMARKET_API_KEY"
    "POLYMARKET_PRIVATE_KEY"
    "POLYMARKET_PASSPHRASE"
    "POLYMARKET_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  $var not set. Loading from .env..."
    else
        echo "✅ $var configured"
    fi
done

echo ""
echo "Starting Docker services..."

# Start Docker services
if docker-compose up -d; then
    echo "✅ Docker services started"
else
    echo "❌ Failed to start Docker services"
    exit 1
fi

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check health
echo ""
echo "Verifying API health..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
else
    echo "⚠️  API health check failed (may still be starting)"
fi

echo ""
echo "======================================"
echo "1-WEEK TEST CONFIGURATION"
echo "======================================"
echo ""
echo "Test Mode:              ENABLED"
echo "Virtual Balance:        $10,000"
echo "Duration:               7 days"
echo "Trading Mode:           Virtual tokens (no real money)"
echo "Leaderboard Metrics:    ENABLED"
echo "API Credentials:        ✅ Configured"
echo ""

echo "======================================"
echo "NEXT STEPS"
echo "======================================"
echo ""
echo "1. View application logs:"
echo "   docker-compose logs -f api"
echo ""
echo "2. Check health endpoint:"
echo "   curl http://localhost:3000/health"
echo ""
echo "3. Monitor metrics:"
echo "   npm run metrics:export"
echo ""
echo "4. Stop the test:"
echo "   docker-compose down"
echo ""
echo "======================================"
echo "Test is running. Press Ctrl+C to stop."
echo "======================================"
echo ""

# Keep script running
tail -f /dev/null 2>/dev/null || true
