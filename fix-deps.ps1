# RinaWarp Terminal - Advanced Terminal Emulator
# Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
# 
# This file is part of RinaWarp Terminal, an advanced terminal emulator with
# AI assistance, enterprise security, cloud sync, and revolutionary features.
# 
# CONFIDENTIAL AND PROPRIETARY
# This source code is proprietary and confidential information of RinaWarp Technologies.
# Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
# 
# Patent Pending - Advanced Terminal Integration Architecture
# 
# Licensed under RinaWarp Commercial License.
# See LICENSE file for detailed terms and conditions.
# 
# For licensing inquiries, contact: licensing@rinawarp.com

# RinaWarp Terminal - Advanced Terminal Emulator
# Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
# 
# This file is part of RinaWarp Terminal, an advanced terminal emulator with
# AI assistance, enterprise security, cloud sync, and revolutionary features.
# 
# CONFIDENTIAL AND PROPRIETARY
# This source code is proprietary and confidential information of RinaWarp Technologies.
# Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
# 
# Patent Pending - Advanced Terminal Integration Architecture
# 
# Licensed under RinaWarp Commercial License.
# See LICENSE file for detailed terms and conditions.
# 
# For licensing inquiries, contact: licensing@rinawarp.com

# Fix dependency issues script
# This script handles locked files and reinstalls dependencies

Write-Host "Fixing RinaWarp Terminal Dependencies..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Function to handle locked files
function Remove-LockedDirectory {
    param($Path)
    
    if (Test-Path $Path) {
        Write-Host "Attempting to remove locked directory: $Path" -ForegroundColor Yellow
        
        try {
            # Try using robocopy to delete (works with locked files)
            $tempDir = [System.IO.Path]::GetTempPath() + "empty_" + [System.Guid]::NewGuid().ToString("N").Substring(0,8)
            New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
            
            Write-Host "Using robocopy to remove locked files..." -ForegroundColor Gray
            robocopy $tempDir $Path /MIR /R:0 /W:0 /NP /NJH /NJS | Out-Null
            
            Remove-Item $tempDir -Force -ErrorAction SilentlyContinue
            Remove-Item $Path -Force -Recurse -ErrorAction SilentlyContinue
            
            Write-Host "Successfully removed $Path" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "Failed to remove $Path using robocopy: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    return $true
}

# Step 1: Stop any running Node/npm processes
Write-Host "[1/5] Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node", "npm", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Clear npm cache
Write-Host "[2/5] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Step 3: Remove locked node_modules
Write-Host "[3/5] Removing node_modules directory..." -ForegroundColor Yellow
$success = Remove-LockedDirectory "node_modules"

if (-not $success) {
    Write-Host "Warning: Could not fully remove node_modules. Trying alternative approach..." -ForegroundColor Yellow
    
    # Try renaming the directory first (sometimes works with locked files)
    $backupName = "node_modules_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss")
    try {
        Rename-Item "node_modules" $backupName -ErrorAction Stop
        Write-Host "Renamed node_modules to $backupName" -ForegroundColor Gray
    }
    catch {
        Write-Host "Could not rename node_modules. Proceeding anyway..." -ForegroundColor Yellow
    }
}

# Step 4: Remove package-lock.json
Write-Host "[4/5] Removing package-lock.json..." -ForegroundColor Yellow
Remove-Item "package-lock.json" -ErrorAction SilentlyContinue

# Step 5: Reinstall dependencies
Write-Host "[5/5] Reinstalling dependencies..." -ForegroundColor Yellow

try {
    # First install brace-expansion specifically
    Write-Host "Installing brace-expansion..." -ForegroundColor Gray
    npm install brace-expansion --no-package-lock
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully installed brace-expansion" -ForegroundColor Green
    }
    
    # Then install all dependencies
    Write-Host "Installing all dependencies..." -ForegroundColor Gray
    npm install --no-package-lock
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Dependencies installed successfully!" -ForegroundColor Green
        
        # Test the build
        Write-Host "Testing build configuration..." -ForegroundColor Gray
        npm run build-win --dry-run
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build configuration is working!" -ForegroundColor Green
            Write-Host "You can now run: .\build-installer.ps1" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️ Build test failed, but dependencies are installed" -ForegroundColor Yellow
        }
    } else {
        throw "npm install failed"
    }
    
} catch {
    Write-Host "❌ Error during installation: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "" 
    Write-Host "Manual steps to try:" -ForegroundColor Yellow
    Write-Host "1. Restart your computer to unlock files" -ForegroundColor Gray
    Write-Host "2. Run as Administrator" -ForegroundColor Gray
    Write-Host "3. Disable antivirus temporarily" -ForegroundColor Gray
    Write-Host "4. Clone the project to a new directory" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Script completed." -ForegroundColor Green



