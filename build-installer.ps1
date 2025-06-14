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

# RinaWarp Terminal Installer Builder
# This script builds both NSIS installer and portable executable

Param(
    [switch]$Clean,
    [switch]$SkipInstall,
    [switch]$OnlyPortable,
    [switch]$OnlyInstaller
)

$ErrorActionPreference = "Stop"

Write-Host "Building RinaWarp Terminal Installer..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Set location to script directory
Set-Location $PSScriptRoot

try {
    # Step 1: Install dependencies (unless skipped)
    if (-not $SkipInstall) {
        Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
    } else {
        Write-Host "[1/4] Skipping dependency installation..." -ForegroundColor Yellow
    }

    # Step 2: Clean previous builds
    Write-Host "[2/4] Cleaning previous builds..." -ForegroundColor Yellow
    if ($Clean -and (Test-Path "dist")) {
        Remove-Item "dist" -Recurse -Force
        Write-Host "Cleaned dist directory" -ForegroundColor Gray
    }
    if ($Clean -and (Test-Path "build")) {
        Remove-Item "build" -Recurse -Force
        Write-Host "Cleaned build directory" -ForegroundColor Gray
    }

    # Step 3: Build application
    Write-Host "[3/4] Building application..." -ForegroundColor Yellow
    
    if ($OnlyPortable) {
        npm run build-portable
    } elseif ($OnlyInstaller) {
        npm run build-installer
    } else {
        npm run build-all
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }

    # Step 4: Show results
    Write-Host "[4/4] Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor Cyan
    
    $distFiles = Get-ChildItem "dist" -Filter "*.exe" -ErrorAction SilentlyContinue
    foreach ($file in $distFiles) {
        $size = [math]::Round($file.Length / 1MB, 2)
        if ($file.Name -match "Setup") {
            Write-Host "  📦 NSIS Installer: $($file.Name) ($size MB)" -ForegroundColor Green
        } elseif ($file.Name -match "Portable") {
            Write-Host "  💼 Portable Version: $($file.Name) ($size MB)" -ForegroundColor Blue
        } else {
            Write-Host "  📁 $($file.Name) ($size MB)" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "Opening dist folder..." -ForegroundColor Gray
    Start-Process "explorer" -ArgumentList (Resolve-Path "dist").Path
    
    Write-Host ""
    Write-Host "✅ Build process completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Build failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



