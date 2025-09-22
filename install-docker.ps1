# Auto-install Docker Desktop for Windows
# This script will download and install Docker Desktop automatically

Write-Host "🐳 Auto-Installing Docker Desktop for Windows" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs to run as Administrator to install Docker Desktop" -ForegroundColor Yellow
    Write-Host "   Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor White
    exit 1
}

# Create temp directory
$tempDir = "$env:TEMP\docker-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Download Docker Desktop installer
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$tempDir\DockerDesktopInstaller.exe"

Write-Host "📥 Downloading Docker Desktop installer..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Download completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download Docker Desktop installer" -ForegroundColor Red
    Write-Host "   Please download manually from: $dockerUrl" -ForegroundColor White
    exit 1
}

# Install Docker Desktop
Write-Host "🔧 Installing Docker Desktop..." -ForegroundColor Cyan
Write-Host "   This may take several minutes..." -ForegroundColor Yellow

try {
    Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait
    Write-Host "✅ Docker Desktop installation completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Installation failed" -ForegroundColor Red
    Write-Host "   Please run the installer manually: $installerPath" -ForegroundColor White
    exit 1
}

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n🎯 Next Steps:" -ForegroundColor Green
Write-Host "   1. Restart your computer" -ForegroundColor White
Write-Host "   2. Start Docker Desktop from Start Menu" -ForegroundColor White
Write-Host "   3. Wait for Docker to start (whale icon in system tray)" -ForegroundColor White
Write-Host "   4. Run the OSRD setup script: .\setup-osrd.ps1" -ForegroundColor White

Write-Host "`n🚂 After restart, your Mumbai train simulation will have real OSRD backend!" -ForegroundColor Yellow