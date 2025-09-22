# Mumbai Train Simulation - Real OSRD Backend Setup Script
# This script will help you install Docker Desktop and deploy real OSRD backend

Write-Host "🚂 Mumbai Train Simulation - Real OSRD Backend Setup" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Step 1: Check if Docker is installed
Write-Host "`n📋 Step 1: Checking Docker installation..." -ForegroundColor Yellow

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker is already installed!" -ForegroundColor Green
    docker --version
} else {
    Write-Host "❌ Docker not found. Please follow these steps:" -ForegroundColor Red
    Write-Host "`n🔗 Install Docker Desktop for Windows:" -ForegroundColor Cyan
    Write-Host "   1. Go to: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -ForegroundColor White
    Write-Host "   2. Download and run the installer" -ForegroundColor White
    Write-Host "   3. Follow the installation wizard" -ForegroundColor White
    Write-Host "   4. Restart your computer after installation" -ForegroundColor White
    Write-Host "   5. Start Docker Desktop from Start Menu" -ForegroundColor White
    Write-Host "   6. Wait for Docker to start (you'll see a whale icon in system tray)" -ForegroundColor White
    Write-Host "`n⚠️  After installing Docker, run this script again!" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if Docker is running
Write-Host "`n📋 Step 2: Checking if Docker is running..." -ForegroundColor Yellow

try {
    docker info | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop!" -ForegroundColor Red
    Write-Host "   Look for the Docker whale icon in your system tray" -ForegroundColor White
    exit 1
}

# Step 3: Stop any existing containers
Write-Host "`n📋 Step 3: Cleaning up existing containers..." -ForegroundColor Yellow

docker-compose -f docker-compose.osrd.yml down 2>$null
docker stop osrd-backend osrd-postgres mumbai-train-backend 2>$null
docker rm osrd-backend osrd-postgres mumbai-train-backend 2>$null

Write-Host "✅ Cleanup completed!" -ForegroundColor Green

# Step 4: Pull required Docker images
Write-Host "`n📋 Step 4: Pulling Docker images..." -ForegroundColor Yellow

Write-Host "🔄 Pulling OSRD backend image..." -ForegroundColor Cyan
docker pull ghcr.io/osrd-project/osrd:latest

Write-Host "🔄 Pulling PostgreSQL image..." -ForegroundColor Cyan
docker pull postgres:13

Write-Host "✅ Images pulled successfully!" -ForegroundColor Green

# Step 5: Deploy the stack
Write-Host "`n📋 Step 5: Deploying OSRD stack..." -ForegroundColor Yellow

Write-Host "🚀 Starting OSRD backend with PostgreSQL..." -ForegroundColor Cyan
docker-compose -f docker-compose.osrd.yml up -d postgres osrd-backend

Write-Host "`n⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 6: Check service health
Write-Host "`n📋 Step 6: Checking service health..." -ForegroundColor Yellow

Write-Host "🔍 Checking PostgreSQL..." -ForegroundColor Cyan
$pgHealth = docker exec osrd-postgres pg_isready -U osrd -d osrd 2>$null
if ($pgHealth -match "accepting connections") {
    Write-Host "✅ PostgreSQL is healthy!" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL is not ready yet" -ForegroundColor Red
}

Write-Host "🔍 Checking OSRD backend..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 10
    Write-Host "✅ OSRD backend is healthy!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  OSRD backend is starting up..." -ForegroundColor Yellow
    Write-Host "   This may take a few minutes on first run" -ForegroundColor White
}

# Step 7: Display connection info
Write-Host "`n🎯 Service URLs:" -ForegroundColor Green
Write-Host "   OSRD Backend: http://localhost:8080" -ForegroundColor White
Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White

Write-Host "`n📊 To check logs:" -ForegroundColor Cyan
Write-Host "   docker logs osrd-backend" -ForegroundColor White
Write-Host "   docker logs osrd-postgres" -ForegroundColor White

Write-Host "`n🔧 To stop services:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.osrd.yml down" -ForegroundColor White

Write-Host "`n🚂 Real OSRD Backend Setup Complete!" -ForegroundColor Green
Write-Host "   You can now run your Mumbai train simulation with real OSRD!" -ForegroundColor Yellow