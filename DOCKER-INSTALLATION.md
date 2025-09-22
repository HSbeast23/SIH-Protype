# Mumbai Train Simulation - Docker Installation Guide

# Manual steps to install Docker Desktop for real OSRD backend

## Option 1: Manual Installation (Recommended)

1. **Download Docker Desktop**

   - Go to: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
   - Save the file to your Downloads folder

2. **Install Docker Desktop**

   - Right-click the downloaded file and select "Run as administrator"
   - Follow the installation wizard
   - Accept the license agreement
   - Choose "Use WSL 2 instead of Hyper-V" (recommended)
   - Complete the installation

3. **Restart Computer**

   - Docker Desktop requires a restart to complete installation

4. **Start Docker Desktop**
   - Find Docker Desktop in Start Menu
   - Launch the application
   - Wait for the whale icon to appear in system tray
   - Sign in with Docker Hub account (optional but recommended)

## Option 2: Automated Installation

Run this PowerShell command as Administrator:

```powershell
# Right-click PowerShell and select "Run as Administrator"
.\install-docker.ps1
```

## Option 3: Alternative Package Managers

### Using Chocolatey (if installed):

```powershell
choco install docker-desktop
```

### Using Winget (Windows 10/11):

```powershell
winget install Docker.DockerDesktop
```

## After Docker Installation

1. **Verify Docker is running:**

   ```powershell
   docker --version
   docker info
   ```

2. **Deploy Real OSRD Backend:**

   ```powershell
   .\setup-osrd.ps1
   ```

3. **Access Services:**
   - OSRD Backend: http://localhost:8080
   - PostgreSQL: localhost:5432
   - Your Frontend: http://localhost:3000

## System Requirements

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 15063 or later)
- OR Windows 11 64-bit: Home or Pro version 21H2 or higher
- WSL 2 feature enabled
- 4GB RAM minimum (8GB recommended)
- Virtualization enabled in BIOS/UEFI

## Troubleshooting

### If Docker fails to start:

1. Enable Windows features: Hyper-V and Containers
2. Enable WSL 2: `wsl --install`
3. Check BIOS virtualization settings
4. Restart computer after enabling features

### If installation fails:

1. Run installer as Administrator
2. Temporarily disable antivirus
3. Clear Windows Update cache
4. Try offline installer if network issues

## What Happens After Installation

Once Docker is running, the setup script will:

1. Pull OSRD Docker image (ghcr.io/osrd-project/osrd:latest)
2. Pull PostgreSQL image with PostGIS
3. Start OSRD backend on port 8080
4. Initialize PostgreSQL database
5. Configure networking between containers
6. Enable OSM railway data import
7. Setup Mumbai train simulation environment

**Result: Real OSRD backend instead of mock simulation!** 🚂
