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
# RinaWarp Terminal Server Startup Script
# This script loads environment variables and starts the server securely

Write-Host "Starting RinaWarp Terminal Server..." -ForegroundColor Green

# Load environment variables from .env file if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
    
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#].*?)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  ✓ $name" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No .env file found. Using system environment variables." -ForegroundColor Yellow
}

# Verify required environment variables
$required_vars = @(
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_PRICE_PERSONAL", 
    "STRIPE_PRICE_PROFESSIONAL",
    "STRIPE_PRICE_TEAM"
)

$missing_vars = @()
foreach ($var in $required_vars) {
    if (-not [Environment]::GetEnvironmentVariable($var, "Process")) {
        $missing_vars += $var
    }
}

if ($missing_vars.Count -gt 0) {
    Write-Host "ERROR: Missing required environment variables:" -ForegroundColor Red
    $missing_vars | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
    Write-Host "Please set these variables in your .env file or system environment." -ForegroundColor Red
    exit 1
}

Write-Host "All environment variables are set. Starting server..." -ForegroundColor Green

# Start the server
npm run server

