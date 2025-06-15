# RinaWarp Terminal - Cleanup Script
# Copyright (c) 2025 RinaWarp Technologies
# 
# This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
# AI assistance, live collaboration, and enterprise-grade security features.
# 
# Licensed under the MIT License.
# See LICENSE file for detailed terms and conditions.
# 
# Project repository: https://github.com/rinawarp/terminal

#!/usr/bin/env pwsh
# RinaWarp Terminal - Automated Cleanup Script
# This script cleans up build artifacts, temporary files, and caches

param(
    [switch]$Deep,
    [switch]$NodeModules,
    [switch]$Cache,
    [switch]$Logs,
    [switch]$All,
    [switch]$DryRun,
    [switch]$Verbose
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Get-DirectorySize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 2)
    }
    return 0
}

function Remove-DirectorySafe {
    param([string]$Path, [string]$Description)
    
    if (Test-Path $Path) {
        $sizeBefore = Get-DirectorySize -Path $Path
        Write-ColorOutput "📁 $Description ($sizeBefore MB)" $Blue
        
        if (-not $DryRun) {
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
                Write-ColorOutput "✅ Removed $Description" $Green
            } catch {
                Write-ColorOutput "❌ Failed to remove $Description`: $($_.Exception.Message)" $Red
            }
        } else {
            Write-ColorOutput "🔍 [DRY RUN] Would remove $Description" $Yellow
        }
    } else {
        if ($Verbose) {
            Write-ColorOutput "ℹ️  $Description not found" $Blue
        }
    }
}

function Remove-FilesSafe {
    param([string]$Pattern, [string]$Description)
    
    $files = Get-ChildItem -Path . -Filter $Pattern -Recurse -Force -ErrorAction SilentlyContinue
    if ($files) {
        $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($totalSize / 1MB, 2)
        Write-ColorOutput "📄 $Description ($($files.Count) files, $sizeMB MB)" $Blue
        
        if (-not $DryRun) {
            try {
                $files | Remove-Item -Force -ErrorAction Stop
                Write-ColorOutput "✅ Removed $Description" $Green
            } catch {
                Write-ColorOutput "❌ Failed to remove some $Description`: $($_.Exception.Message)" $Red
            }
        } else {
            Write-ColorOutput "🔍 [DRY RUN] Would remove $Description" $Yellow
        }
    } else {
        if ($Verbose) {
            Write-ColorOutput "ℹ️  No $Description found" $Blue
        }
    }
}

# Main cleanup function
function Start-Cleanup {
    Write-ColorOutput "🧹 Starting RinaWarp Terminal Cleanup..." $Green
    Write-ColorOutput "📍 Working directory: $PWD" $Blue
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN MODE - No files will be deleted" $Yellow
    }
    
    $totalSizeBefore = 0
    $startTime = Get-Date
    
    # Build artifacts and distribution files
    if ($All -or $Deep) {
        Write-ColorOutput "`n🏗️  Cleaning build artifacts..." $Green
        Remove-DirectorySafe -Path "./dist" -Description "Distribution directory"
        Remove-DirectorySafe -Path "./build" -Description "Build directory"
        Remove-DirectorySafe -Path "./out" -Description "Output directory"
        Remove-DirectorySafe -Path "./app-extracted" -Description "Extracted app directory"
    }
    
    # Node.js related cleanup
    if ($All -or $NodeModules -or $Deep) {
        Write-ColorOutput "`n📦 Cleaning Node.js artifacts..." $Green
        Remove-DirectorySafe -Path "./node_modules" -Description "Node modules"
        Remove-FilesSafe -Pattern "package-lock.json" -Description "Package lock file"
        Remove-FilesSafe -Pattern "yarn.lock" -Description "Yarn lock file"
        Remove-FilesSafe -Pattern "pnpm-lock.yaml" -Description "PNPM lock file"
    }
    
    # Cache directories
    if ($All -or $Cache -or $Deep) {
        Write-ColorOutput "`n🗂️  Cleaning cache directories..." $Green
        Remove-DirectorySafe -Path "./node_modules/.cache" -Description "Node modules cache"
        Remove-DirectorySafe -Path "./.npm" -Description "NPM cache"
        Remove-DirectorySafe -Path "./.yarn" -Description "Yarn cache"
        Remove-DirectorySafe -Path "./.pnpm-store" -Description "PNPM store"
        Remove-DirectorySafe -Path "./coverage" -Description "Test coverage reports"
    }
    
    # Log files and temporary files
    if ($All -or $Logs -or $Deep) {
        Write-ColorOutput "`n📋 Cleaning logs and temporary files..." $Green
        Remove-FilesSafe -Pattern "*.log" -Description "Log files"
        Remove-FilesSafe -Pattern "*.tmp" -Description "Temporary files"
        Remove-FilesSafe -Pattern "*.temp" -Description "Temp files"
        Remove-FilesSafe -Pattern ".DS_Store" -Description "macOS metadata files"
        Remove-FilesSafe -Pattern "Thumbs.db" -Description "Windows thumbnail cache"
        Remove-FilesSafe -Pattern "desktop.ini" -Description "Windows desktop config files"
    }
    
    # Electron specific cleanup
    if ($All -or $Deep) {
        Write-ColorOutput "`n⚡ Cleaning Electron artifacts..." $Green
        Remove-DirectorySafe -Path "./electron-dist" -Description "Electron distribution"
        Remove-DirectorySafe -Path "./release" -Description "Release directory"
        Remove-FilesSafe -Pattern "*.asar" -Description "ASAR archive files"
    }
    
    # Development artifacts
    if ($All -or $Deep) {
        Write-ColorOutput "`n🔧 Cleaning development artifacts..." $Green
        Remove-FilesSafe -Pattern "*.swp" -Description "Vim swap files"
        Remove-FilesSafe -Pattern "*.swo" -Description "Vim backup files"
        Remove-FilesSafe -Pattern "*~" -Description "Editor backup files"
        Remove-DirectorySafe -Path "./.vscode/settings.json.bak" -Description "VSCode backup settings"
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-ColorOutput "`n✨ Cleanup completed!" $Green
    Write-ColorOutput "⏱️  Duration: $($duration.TotalSeconds.ToString('F2')) seconds" $Blue
    
    # Suggest next steps
    if ($NodeModules -or $All -or $Deep) {
        Write-ColorOutput "`n💡 Don't forget to run 'npm install' to restore dependencies!" $Yellow
    }
}

# Show help
function Show-Help {
    Write-ColorOutput "🧹 RinaWarp Terminal Cleanup Script" $Green
    Write-ColorOutput ""
    Write-ColorOutput "Usage: .\cleanup.ps1 [options]" $Blue
    Write-ColorOutput ""
    Write-ColorOutput "Options:" $Blue
    Write-ColorOutput "  -All          Clean everything (build, cache, logs, node_modules)" $Yellow
    Write-ColorOutput "  -Deep         Deep clean (includes all build artifacts and dev files)" $Yellow
    Write-ColorOutput "  -NodeModules  Clean node_modules and lock files" $Yellow
    Write-ColorOutput "  -Cache        Clean cache directories only" $Yellow
    Write-ColorOutput "  -Logs         Clean log and temporary files only" $Yellow
    Write-ColorOutput "  -DryRun       Show what would be deleted without actually deleting" $Yellow
    Write-ColorOutput "  -Verbose      Show detailed output" $Yellow
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" $Blue
    Write-ColorOutput "  .\cleanup.ps1 -All         # Clean everything" $Green
    Write-ColorOutput "  .\cleanup.ps1 -DryRun      # Preview what would be cleaned" $Green
    Write-ColorOutput "  .\cleanup.ps1 -Cache -Logs # Clean only cache and logs" $Green
}

# Main execution
if ($args.Count -eq 0 -and -not ($All -or $Deep -or $NodeModules -or $Cache -or $Logs)) {
    Show-Help
    Write-ColorOutput "`n❓ No cleanup options specified. Use -All for complete cleanup or see options above." $Yellow
    exit 0
}

Start-Cleanup



