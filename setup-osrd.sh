#!/bin/bash

# OSRD Mumbai Train Simulation Setup Script
# This script sets up the complete OSRD backend with Mumbai train simulation

echo "🚂 Setting up OSRD Mumbai Train Simulation"
echo "========================================="

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p osm-data
mkdir -p server/data

# Download Mumbai OSM data if not exists
if [ ! -f "osm-data/mumbai.osm.pbf" ]; then
    echo "📥 Downloading Mumbai OSM railway data..."
    wget -O osm-data/mumbai.osm.pbf "http://download.geofabrik.de/asia/india/maharashtra-latest.osm.pbf"
    
    if [ $? -eq 0 ]; then
        echo "✅ Mumbai OSM data downloaded successfully"
    else
        echo "⚠️  Failed to download OSM data. You can manually download it from:"
        echo "   https://download.geofabrik.de/asia/india/maharashtra-latest.osm.pbf"
        echo "   and place it in osm-data/mumbai.osm.pbf"
    fi
fi

# Build and start Docker services
echo "🐳 Building and starting Docker services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for OSRD backend to be ready..."
sleep 30

# Health check
echo "🔍 Checking service health..."
MAX_ATTEMPTS=12
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - Checking OSRD health..."
    
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ OSRD backend is healthy!"
        break
    else
        echo "⏳ OSRD backend not ready yet, waiting 10 seconds..."
        sleep 10
        ATTEMPT=$((ATTEMPT+1))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ OSRD backend failed to start properly"
    echo "📋 Checking logs..."
    docker-compose logs osrd
    exit 1
fi

# Check Node.js backend
echo "🔍 Checking Node.js backend..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Node.js backend is healthy!"
else
    echo "❌ Node.js backend is not responding"
    docker-compose logs backend
fi

# Check React frontend
echo "🔍 Checking React frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ React frontend is accessible!"
else
    echo "❌ React frontend is not responding"
    docker-compose logs frontend
fi

# Import Mumbai railway data into OSRD
echo "🚄 Importing Mumbai railway data into OSRD..."
curl -X POST http://localhost:3001/api/osrd/import \
  -H "Content-Type: application/json" \
  -d '{"osmFilePath": "/app/osm-data/mumbai.osm.pbf"}' \
  || echo "⚠️  OSM import may have failed - check logs"

echo ""
echo "🎉 OSRD Mumbai Train Simulation Setup Complete!"
echo "=============================================="
echo ""
echo "🌐 Access points:"
echo "   Frontend (React):     http://localhost:3000"
echo "   Backend (Node.js):    http://localhost:3001"
echo "   OSRD Backend:         http://localhost:8080"
echo ""
echo "📊 API Endpoints:"
echo "   Health Check:         http://localhost:3001/api/health"
echo "   Mumbai Trains:        http://localhost:3001/api/trains/mumbai"
echo "   OSRD Simulation:      http://localhost:3001/api/osrd/simulation"
echo ""
echo "🚂 Features:"
echo "   ✅ 5 Mumbai trains with realistic schedules"
echo "   ✅ Real OSM railway tracks from Mumbai"
echo "   ✅ OSRD-powered train movement simulation"
echo "   ✅ Real-time visualization with Leaflet"
echo ""
echo "📋 To check logs: docker-compose logs [service_name]"
echo "🛑 To stop:       docker-compose down"
echo "🔄 To restart:    docker-compose restart"
echo ""