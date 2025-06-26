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
# Create ICNS files from PNG assets using ImageMagick
# This script creates macOS ICNS icon files from existing PNG assets

Write-Host "Creating ICNS files from PNG assets..." -ForegroundColor Green

# Define the assets directory
$assetsDir = ".\assets"
$icnsDir = "$assetsDir\icns"

# Create icns directory if it doesn't exist
if (!(Test-Path $icnsDir)) {
    New-Item -ItemType Directory -Path $icnsDir -Force
    Write-Host "Created icns directory: $icnsDir" -ForegroundColor Yellow
}

# Define PNG sizes needed for ICNS (standard macOS icon sizes)
$iconSizes = @(16, 32, 128, 256, 512, 1024)

# Function to create ICNS file from PNG assets
function Create-ICNS {
    param(
        [string]$iconName,
        [string]$basePngPath
    )
    
    Write-Host "Creating $iconName.icns..." -ForegroundColor Cyan
    
    # Check if base PNG exists
    if (!(Test-Path $basePngPath)) {
        Write-Host "Warning: Base PNG not found: $basePngPath" -ForegroundColor Red
        return
    }
    
    # Create temporary directory for individual icon sizes
    $tempDir = "$icnsDir\temp_$iconName"
    if (!(Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force
    }
    
    try {
        # Generate all required sizes from the base PNG
        foreach ($size in $iconSizes) {
            $outputPng = "$tempDir\icon_${size}x${size}.png"
            Write-Host "  Creating ${size}x${size} PNG..." -ForegroundColor Gray
            
            # Use ImageMagick to resize
            & magick $basePngPath -resize "${size}x${size}" $outputPng
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "    Error creating ${size}x${size} PNG" -ForegroundColor Red
            }
        }
        
        # Create ICNS file from all PNG sizes
        $icnsOutput = "$icnsDir\$iconName.icns"
        Write-Host "  Combining PNGs into ICNS..." -ForegroundColor Gray
        
        # Use ImageMagick to create ICNS
        $pngFiles = Get-ChildItem "$tempDir\*.png" | Sort-Object Name
        $pngPaths = $pngFiles.FullName -join ' '
        
        # Create ICNS using ImageMagick
        & magick ($pngFiles.FullName) $icnsOutput
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Successfully created: $icnsOutput" -ForegroundColor Green
        } else {
            Write-Host "  Error creating ICNS file" -ForegroundColor Red
        }
        
    } finally {
        # Clean up temporary directory
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }
}

# Create ICNS files for main icons
Write-Host "`nGenerating ICNS files..." -ForegroundColor Yellow

# App icon (main icon)
if (Test-Path "$assetsDir\icon-1024.png") {
    Create-ICNS -iconName "icon" -basePngPath "$assetsDir\icon-1024.png"
} elseif (Test-Path "$assetsDir\icon-512.png") {
    Create-ICNS -iconName "icon" -basePngPath "$assetsDir\icon-512.png"
} else {
    Write-Host "Warning: No suitable base icon found (looking for icon-1024.png or icon-512.png)" -ForegroundColor Red
}

# Rinawarp icon
if (Test-Path "$assetsDir\png\rinawarp-icon-1024.png") {
    Create-ICNS -iconName "rinawarp-icon" -basePngPath "$assetsDir\png\rinawarp-icon-1024.png"
} elseif (Test-Path "$assetsDir\png\rinawarp-icon-512.png") {
    Create-ICNS -iconName "rinawarp-icon" -basePngPath "$assetsDir\png\rinawarp-icon-512.png"
} else {
    Write-Host "Warning: No suitable rinawarp icon found" -ForegroundColor Red
}

# Terminal icon
if (Test-Path "$assetsDir\png\terminal-icon-1024.png") {
    Create-ICNS -iconName "terminal-icon" -basePngPath "$assetsDir\png\terminal-icon-1024.png"
} elseif (Test-Path "$assetsDir\png\terminal-icon-512.png") {
    Create-ICNS -iconName "terminal-icon" -basePngPath "$assetsDir\png\terminal-icon-512.png"
} else {
    Write-Host "Warning: No suitable terminal icon found" -ForegroundColor Red
}

Write-Host "`nICNS creation completed!" -ForegroundColor Green
Write-Host "Generated ICNS files are in: $icnsDir" -ForegroundColor Cyan

# List created ICNS files
if (Test-Path $icnsDir) {
    $icnsFiles = Get-ChildItem "$icnsDir\*.icns"
    if ($icnsFiles) {
        Write-Host "`nCreated ICNS files:" -ForegroundColor Yellow
        foreach ($file in $icnsFiles) {
            $size = [math]::Round((Get-Item $file.FullName).Length / 1KB, 2)
            Write-Host "  $($file.Name) (${size} KB)" -ForegroundColor White
        }
    }
}

Write-Host "`nNext steps:" -ForegroundColor Magenta
Write-Host "1. Update package.json to use .icns files for macOS builds" -ForegroundColor White
Write-Host "2. Test macOS build configuration" -ForegroundColor White

