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

# RinaWarp Brand Asset PNG Export Script
# Converts SVG files to PNG format for various use cases

Write-Host "RinaWarp Brand Asset Export Tool" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if Inkscape or another SVG converter is available
$converters = @(
    @{Name="Inkscape"; Path="inkscape"; Args="--export-type=png --export-dpi=300"},
    @{Name="Magick"; Path="magick"; Args="convert -density 300"},
    @{Name="rsvg-convert"; Path="rsvg-convert"; Args="--format=png --dpi-x=300 --dpi-y=300"}
)

$converter = $null
foreach ($conv in $converters) {
    try {
        & $conv.Path --version 2>$null | Out-Null
        $converter = $conv
        Write-Host "✓ Found $($conv.Name)" -ForegroundColor Green
        break
    } catch {
        Write-Host "✗ $($conv.Name) not found" -ForegroundColor Yellow
    }
}

if (-not $converter) {
    Write-Host "" 
    Write-Host "❌ No SVG converter found!" -ForegroundColor Red
    Write-Host "Please install one of the following:" -ForegroundColor White
    Write-Host "1. Inkscape (recommended): https://inkscape.org/" -ForegroundColor White
    Write-Host "2. ImageMagick: https://imagemagick.org/" -ForegroundColor White
    Write-Host "3. librsvg: https://wiki.gnome.org/Projects/LibRsvg" -ForegroundColor White
    exit 1
}

# Create output directories
$pngDir = "png"
$sizesDir = "$pngDir/sizes"
New-Item -ItemType Directory -Force -Path $pngDir | Out-Null
New-Item -ItemType Directory -Force -Path $sizesDir | Out-Null

# Define export sizes for different use cases
$logoSizes = @(
    @{Name="favicon"; Size=32; Description="Browser favicon"},
    @{Name="icon-small"; Size=64; Description="Small icon"},
    @{Name="icon-medium"; Size=128; Description="Medium icon"},
    @{Name="icon-large"; Size=256; Description="Large icon"},
    @{Name="logo-web"; Size=400; Description="Web logo"},
    @{Name="logo-print"; Size=800; Description="Print quality"},
    @{Name="logo-hires"; Size=1200; Description="High resolution"}
)

# SVG files to convert
$svgFiles = @(
    @{File="rinawarp-logo-mermaid-hotpink.svg"; Base="logo-mermaid"},
    @{File="rinawarp-logo-hot-pink.svg"; Base="logo-hotpink"},
    @{File="rinawarp-logo-primary.svg"; Base="logo-primary"},
    @{File="rinawarp-monogram-mermaid-hotpink.svg"; Base="monogram-mermaid"},
    @{File="rinawarp-monogram.svg"; Base="monogram"},
    @{File="favicon.svg"; Base="favicon"}
)

Write-Host ""
Write-Host "🎨 Converting SVG files to PNG..." -ForegroundColor Magenta

foreach ($svgFile in $svgFiles) {
    if (Test-Path $svgFile.File) {
        Write-Host "Converting $($svgFile.File)..." -ForegroundColor White
        
        # Convert to standard PNG
        $outputFile = "$pngDir/$($svgFile.Base).png"
        
        switch ($converter.Name) {
            "Inkscape" {
                & inkscape $svgFile.File --export-type=png --export-filename=$outputFile --export-dpi=300
            }
            "Magick" {
                & magick convert -density 300 $svgFile.File $outputFile
            }
            "rsvg-convert" {
                & rsvg-convert --format=png --dpi-x=300 --dpi-y=300 --output=$outputFile $svgFile.File
            }
        }
        
        if (Test-Path $outputFile) {
            Write-Host "  ✓ Created $outputFile" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Failed to create $outputFile" -ForegroundColor Red
        }
        
        # Create specific sizes for logos and monograms
        if ($svgFile.Base -like "*logo*" -or $svgFile.Base -like "*monogram*") {
            foreach ($size in $logoSizes) {
                $sizedOutput = "$sizesDir/$($svgFile.Base)-$($size.Name)-$($size.Size)px.png"
                
                switch ($converter.Name) {
                    "Inkscape" {
                        & inkscape $svgFile.File --export-type=png --export-filename=$sizedOutput --export-width=$($size.Size) --export-height=$($size.Size)
                    }
                    "Magick" {
                        & magick convert -density 300 $svgFile.File -resize "$($size.Size)x$($size.Size)" $sizedOutput
                    }
                    "rsvg-convert" {
                        & rsvg-convert --format=png --width=$($size.Size) --height=$($size.Size) --output=$sizedOutput $svgFile.File
                    }
                }
                
                if (Test-Path $sizedOutput) {
                    Write-Host "    ✓ Created $($size.Name) ($($size.Size)px)" -ForegroundColor Green
                } else {
                    Write-Host "    ❌ Failed to create $($size.Name) ($($size.Size)px)" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "⚠️  File not found: $($svgFile.File)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📱 Creating app icon set..." -ForegroundColor Magenta

# Create Windows ICO file with multiple sizes
if ($converter.Name -eq "Magick") {
    $icoSizes = @(16, 32, 48, 64, 128, 256)
    $tempFiles = @()
    
    foreach ($size in $icoSizes) {
        $tempFile = "temp_$size.png"
        & magick convert -density 300 "rinawarp-monogram-mermaid-hotpink.svg" -resize "${size}x${size}" $tempFile
        $tempFiles += $tempFile
    }
    
    # Combine into ICO
    & magick convert $tempFiles "rinawarp-icon-mermaid.ico"
    
    # Clean up temp files
    $tempFiles | ForEach-Object { Remove-Item $_ -ErrorAction SilentlyContinue }
    
    if (Test-Path "rinawarp-icon-mermaid.ico") {
        Write-Host "  ✓ Created rinawarp-icon-mermaid.ico" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create rinawarp-icon-mermaid.ico" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Export complete!" -ForegroundColor Green
Write-Host "📁 PNG files: $pngDir/" -ForegroundColor White
Write-Host "📐 Sized versions: $sizesDir/" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Your brand assets are now ready for launch!" -ForegroundColor Cyan



