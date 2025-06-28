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

#!/usr/bin/env pwsh
# RinaWarp Terminal - Quick Development Cleanup
# Fast cleanup script for development workflow

param(
    [switch]$Force,
    [switch]$Verbose
)

# Colors
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Status {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Get-FolderSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 1)
    }
    return 0
}

Write-Status "⚡ Quick Development Cleanup" $Green
Write-Status "Working in: $PWD" $Blue

$startTime = Get-Date
$totalCleaned = 0

# Quick items to clean
$cleanupItems = @(
    @{ Path = "./dist"; Name = "Build output" },
    @{ Path = "./build"; Name = "Build directory" },
    @{ Path = "./app-extracted"; Name = "Extracted files" },
    @{ Path = "./coverage"; Name = "Coverage reports" },
    @{ Path = "./.npm"; Name = "NPM cache" },
    @{ Path = "./node_modules/.cache"; Name = "Node cache" }
)

# Clean temporary files
$tempPatterns = @("*.log", "*.tmp", "*.temp", "Thumbs.db", "desktop.ini")

foreach ($item in $cleanupItems) {
    if (Test-Path $item.Path) {
        $size = Get-FolderSize -Path $item.Path
        if ($size -gt 0) {
            Write-Status "🗑️  $($item.Name) ($size MB)" $Yellow
            Remove-Item -Path $item.Path -Recurse -Force -ErrorAction SilentlyContinue
            $totalCleaned += $size
        }
    } elseif ($Verbose) {
        Write-Status "ℹ️  $($item.Name) - not found" $Blue
    }
}

# Clean temp files
$tempFiles = @()
foreach ($pattern in $tempPatterns) {
    $tempFiles += Get-ChildItem -Path . -Filter $pattern -Recurse -Force -ErrorAction SilentlyContinue
}

if ($tempFiles) {
    $tempSize = ($tempFiles | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Status "🗑️  Temporary files ($($tempFiles.Count) files, $([math]::Round($tempSize, 1)) MB)" $Yellow
    $tempFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    $totalCleaned += $tempSize
}

$duration = (Get-Date) - $startTime
Write-Status "✨ Cleanup completed in $($duration.TotalSeconds.ToString('F1'))s" $Green
Write-Status "📊 Freed up $([math]::Round($totalCleaned, 1)) MB" $Green

if ($totalCleaned -gt 100) {
    Write-Status "💡 Consider running full cleanup: .\cleanup.ps1 -All" $Blue
}



