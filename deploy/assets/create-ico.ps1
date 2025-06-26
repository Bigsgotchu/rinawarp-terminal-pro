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
# Create ICO files from PNG assets for Windows application icons
# This script creates Windows ICO files from the mermaid-themed PNG assets

Write-Host "Creating ICO files for Windows application..." -ForegroundColor Green

# Check if ImageMagick is available
$magickPath = Get-Command "magick" -ErrorAction SilentlyContinue
if (-not $magickPath) {
    Write-Host "ImageMagick not found. Attempting to create ICO using .NET..." -ForegroundColor Yellow
    
    # Use .NET to create a simple ICO file
    Add-Type -AssemblyName System.Drawing
    
    $sourceImage = "png/sizes/monogram-mermaid-icon-large-256px.png"
    $outputIco = "ico/rinawarp-terminal.ico"
    
    if (Test-Path $sourceImage) {
        try {
            # Load the PNG image
            $bitmap = [System.Drawing.Bitmap]::new($sourceImage)
            
            # Create icon from bitmap
            $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
            
            # Save as ICO
            $fs = [System.IO.FileStream]::new($outputIco, [System.IO.FileMode]::Create)
            $icon.Save($fs)
            $fs.Close()
            
            Write-Host "✓ Created: $outputIco" -ForegroundColor Green
            
            # Clean up
            $bitmap.Dispose()
            $icon.Dispose()
            
        } catch {
            Write-Host "Error creating ICO: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Source image not found: $sourceImage" -ForegroundColor Red
    }
} else {
    Write-Host "Using ImageMagick to create ICO files..." -ForegroundColor Green
    
    # Create multi-resolution ICO using ImageMagick
    $sizes = @("16", "32", "48", "64", "128", "256")
    $tempFiles = @()
    
    foreach ($size in $sizes) {
        $tempFile = "temp_${size}.png"
        $sourceFile = "png/sizes/monogram-mermaid-icon-large-256px.png"
        
        if (Test-Path $sourceFile) {
            # Resize to each size
            & magick $sourceFile -resize "${size}x${size}" $tempFile
            $tempFiles += $tempFile
        }
    }
    
    if ($tempFiles.Count -gt 0) {
        # Combine all sizes into one ICO file
        $icoCommand = @("magick") + $tempFiles + @("ico/rinawarp-terminal.ico")
        & $icoCommand[0] $icoCommand[1..($icoCommand.Length-1)]
        
        Write-Host "✓ Created multi-resolution ICO: ico/rinawarp-terminal.ico" -ForegroundColor Green
        
        # Clean up temp files
        foreach ($tempFile in $tempFiles) {
            if (Test-Path $tempFile) {
                Remove-Item $tempFile
            }
        }
    }
}

Write-Host "ICO creation complete!" -ForegroundColor Green

