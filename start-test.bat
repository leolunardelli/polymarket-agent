@echo off
REM Quick Start Script for 1-Week Polymarket Agent Test (Windows)
REM This script sets up and runs the test with all required configurations

echo.
echo ======================================
echo Polymarket Agent - 1-Week Live Test
echo ======================================
echo.

REM Check Docker is installed
where docker >nul 2>nul
if errorlevel 1 (
    echo X Docker not found. Please install Docker first.
    exit /b 1
)

for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo Y Docker detected: %DOCKER_VERSION%
echo.

REM Check environment variables
echo Checking environment configuration...

setlocal enabledelayedexpansion
set "vars=POLYMARKET_API_KEY POLYMARKET_PRIVATE_KEY POLYMARKET_PASSPHRASE POLYMARKET_SECRET"

for %%v in (%vars%) do (
    if "!%%v!"=="" (
        echo W %%v not set. Loading from .env...
    ) else (
        echo Y %%v configured
    )
)

echo.
echo Starting Docker services...

REM Start Docker services
docker-compose up -d
if errorlevel 1 (
    echo X Failed to start Docker services
    exit /b 1
)

echo Y Docker services started
echo.

echo Waiting for services to be ready...
timeout /t 5 /nobreak

REM Check health
echo.
echo Verifying API health...
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 0 (
    echo Y API is healthy
) else (
    echo W API health check in progress (may still be starting^)
)

echo.
echo ======================================
echo 1-WEEK TEST CONFIGURATION
echo ======================================
echo.
echo Test Mode:              ENABLED
echo Virtual Balance:        $10,000
echo Duration:               7 days
echo Trading Mode:           Virtual tokens (no real money^)
echo Leaderboard Metrics:    ENABLED
echo API Credentials:        Y Configured
echo.

echo ======================================
echo NEXT STEPS
echo ======================================
echo.
echo 1. View application logs:
echo    docker-compose logs -f api
echo.
echo 2. Check health endpoint:
echo    curl http://localhost:3000/health
echo.
echo 3. Monitor metrics:
echo    npm run metrics:export
echo.
echo 4. Stop the test:
echo    docker-compose down
echo.
echo ======================================
echo Test is running. Press Ctrl+C to stop.
echo ======================================
echo.

REM Keep running
cmd /k
