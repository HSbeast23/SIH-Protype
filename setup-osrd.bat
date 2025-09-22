@echo off
REM OSRD Mumbai Train Simulation Setup Script for Windows
REM This script sets up the complete OSRD backend with Mumbai train simulation

echo 🚂 Setting up OSRD Mumbai Train Simulation
echo =========================================

REM Check Docker installation
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

echo ✅ Docker and Docker Compose are available

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "osm-data" mkdir osm-data
if not exist "server\data" mkdir server\data

REM Check if Mumbai OSM data exists
if not exist "osm-data\mumbai.osm.pbf" (
    echo 📥 Mumbai OSM data not found. Please download manually:
    echo    URL: https://download.geofabrik.de/asia/india/maharashtra-latest.osm.pbf
    echo    Save as: osm-data\mumbai.osm.pbf
    echo.
    echo ⚠️  Continuing without OSM data - OSRD will use mock simulation
)

REM Build and start Docker services
echo 🐳 Building and starting Docker services...
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for OSRD backend to be ready...
timeout /t 30 /nobreak >nul

REM Health check
echo 🔍 Checking service health...
set MAX_ATTEMPTS=12
set ATTEMPT=1

:healthcheck
echo Attempt %ATTEMPT%/%MAX_ATTEMPTS% - Checking OSRD health...

curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ OSRD backend is healthy!
    goto backend_check
)

echo ⏳ OSRD backend not ready yet, waiting 10 seconds...
timeout /t 10 /nobreak >nul
set /a ATTEMPT+=1

if %ATTEMPT% leq %MAX_ATTEMPTS% goto healthcheck

echo ❌ OSRD backend failed to start properly
echo 📋 Checking logs...
docker-compose logs osrd
exit /b 1

:backend_check
REM Check Node.js backend
echo 🔍 Checking Node.js backend...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js backend is healthy!
) else (
    echo ❌ Node.js backend is not responding
    docker-compose logs backend
)

REM Check React frontend
echo 🔍 Checking React frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ React frontend is accessible!
) else (
    echo ❌ React frontend is not responding
    docker-compose logs frontend
)

REM Import Mumbai railway data into OSRD
echo 🚄 Importing Mumbai railway data into OSRD...
curl -X POST http://localhost:3001/api/osrd/import -H "Content-Type: application/json" -d "{\"osmFilePath\": \"/app/osm-data/mumbai.osm.pbf\"}" 2>nul || echo ⚠️  OSM import may have failed - check logs

echo.
echo 🎉 OSRD Mumbai Train Simulation Setup Complete!
echo ==============================================
echo.
echo 🌐 Access points:
echo    Frontend (React):     http://localhost:3000
echo    Backend (Node.js):    http://localhost:3001
echo    OSRD Backend:         http://localhost:8080
echo.
echo 📊 API Endpoints:
echo    Health Check:         http://localhost:3001/api/health
echo    Mumbai Trains:        http://localhost:3001/api/trains/mumbai
echo    OSRD Simulation:      http://localhost:3001/api/osrd/simulation
echo.
echo 🚂 Features:
echo    ✅ 5 Mumbai trains with realistic schedules
echo    ✅ Real OSM railway tracks from Mumbai
echo    ✅ OSRD-powered train movement simulation
echo    ✅ Real-time visualization with Leaflet
echo.
echo 📋 To check logs: docker-compose logs [service_name]
echo 🛑 To stop:       docker-compose down
echo 🔄 To restart:    docker-compose restart
echo.
pause