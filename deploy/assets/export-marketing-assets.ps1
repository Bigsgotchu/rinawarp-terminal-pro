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
# RinaWarp Terminal - Marketing Assets Export Script
# Exports all SVG marketing assets to PNG format for platform deployment

Write-Host "🎨 RinaWarp Terminal - Marketing Assets Export" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Cyan

# Check if Inkscape is available
$inkscapePath = "inkscape"
try {
    & $inkscapePath --version 2>$null
    Write-Host "✓ Inkscape found" -ForegroundColor Green
} catch {
    Write-Host "❌ Inkscape not found. Please install Inkscape from https://inkscape.org/" -ForegroundColor Red
    Write-Host "Alternative: Use online SVG to PNG converters" -ForegroundColor Yellow
    exit 1
}

# Create output directories
$marketingDir = "marketing"
$outputDir = "marketing\png-exports"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "`n🔄 Exporting marketing assets..." -ForegroundColor Yellow

# Asset definitions with their required sizes for each platform
$assets = @(
    @{
        Name = "Twitter Header"
        File = "twitter-header.svg"
        Sizes = @(
            @{ Width = 1500; Height = 500; Suffix = "twitter-header" }
        )
    },
    @{
        Name = "LinkedIn Cover"
        File = "linkedin-cover.svg"
        Sizes = @(
            @{ Width = 1128; Height = 191; Suffix = "linkedin-cover" }
        )
    },
    @{
        Name = "GitHub Banner"
        File = "github-banner.svg"
        Sizes = @(
            @{ Width = 1280; Height = 640; Suffix = "github-banner" },
            @{ Width = 640; Height = 320; Suffix = "github-banner-small" }
        )
    },
    @{
        Name = "YouTube Cover"
        File = "youtube-cover.svg"
        Sizes = @(
            @{ Width = 2560; Height = 1440; Suffix = "youtube-cover-full" },
            @{ Width = 1280; Height = 720; Suffix = "youtube-cover-hd" }
        )
    }
)

$totalExports = 0
$successfulExports = 0

foreach ($asset in $assets) {
    Write-Host "`n📁 Processing: $($asset.Name)" -ForegroundColor Cyan
    
    $inputFile = Join-Path $marketingDir $asset.File
    
    if (Test-Path $inputFile) {
        foreach ($size in $asset.Sizes) {
            $outputFile = Join-Path $outputDir "rinawarp-$($size.Suffix).png"
            $totalExports++
            
            try {
                Write-Host "  → Exporting $($size.Width)x$($size.Height) to $($size.Suffix).png" -ForegroundColor Gray
                
                & $inkscapePath --export-type=png --export-width=$($size.Width) --export-height=$($size.Height) --export-filename="$outputFile" "$inputFile" 2>$null
                
                if (Test-Path $outputFile) {
                    $fileSize = [math]::Round((Get-Item $outputFile).Length / 1KB, 1)
                    Write-Host "    ✓ Success ($fileSize KB)" -ForegroundColor Green
                    $successfulExports++
                } else {
                    Write-Host "    ❌ Export failed" -ForegroundColor Red
                }
            } catch {
                Write-Host "    ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ❌ Source file not found: $inputFile" -ForegroundColor Red
    }
}

# Create profile picture assets (square versions for social media)
Write-Host "`n👤 Creating profile picture versions..." -ForegroundColor Cyan

$logoSizes = @(32, 64, 128, 256, 400, 512, 1024)
$logoFile = "..\rinawarp-monogram-mermaid-hotpink.svg"

if (Test-Path $logoFile) {
    foreach ($size in $logoSizes) {
        $outputFile = Join-Path $outputDir "rinawarp-profile-$size.png"
        $totalExports++
        
        try {
            Write-Host "  → Creating ${size}x${size} profile image" -ForegroundColor Gray
            & $inkscapePath --export-type=png --export-width=$size --export-height=$size --export-filename="$outputFile" "$logoFile" 2>$null
            
            if (Test-Path $outputFile) {
                $successfulExports++
                Write-Host "    ✓ Success" -ForegroundColor Green
            }
        } catch {
            Write-Host "    ❌ Error creating profile image" -ForegroundColor Red
        }
    }
}

# Generate deployment script
Write-Host "`n📋 Creating deployment guide..." -ForegroundColor Cyan

$deploymentGuide = @"
# 🚀 RinaWarp Terminal - Marketing Asset Deployment Guide

## 📱 Social Media Platform Updates

### Twitter/X (@RinaWarp)
- **Header Image**: rinawarp-twitter-header.png (1500x500)
- **Profile Picture**: rinawarp-profile-400.png (400x400)

### LinkedIn (Company Page)
- **Cover Image**: rinawarp-linkedin-cover.png (1128x191)
- **Logo**: rinawarp-profile-512.png (512x512)

### GitHub Organization
- **Profile Picture**: rinawarp-profile-512.png (512x512)
- **Repository Banner**: rinawarp-github-banner.png (1280x640)

### YouTube Channel
- **Channel Art**: rinawarp-youtube-cover-full.png (2560x1440)
- **Profile Picture**: rinawarp-profile-512.png (512x512)

## 🔧 Quick Deployment Checklist

### Immediate Actions (5 minutes):
- [ ] Update GitHub organization profile picture
- [ ] Replace any existing social media headers
- [ ] Set rinawarp-profile-512.png as profile picture everywhere

### Platform-Specific Setup:

#### GitHub:
1. Go to https://github.com/settings/organizations
2. Upload rinawarp-profile-512.png as organization avatar
3. Add rinawarp-github-banner.png to main repository README

#### Twitter/X:
1. Go to Profile Settings → Edit Profile
2. Upload rinawarp-twitter-header.png as header
3. Upload rinawarp-profile-400.png as profile picture

#### LinkedIn:
1. Go to Company Page Settings
2. Upload rinawarp-linkedin-cover.png as cover image
3. Upload rinawarp-profile-512.png as company logo

#### YouTube:
1. Go to YouTube Studio → Customization → Branding
2. Upload rinawarp-youtube-cover-full.png as channel art
3. Upload rinawarp-profile-512.png as channel icon

## 📊 Asset Usage Guidelines

### File Formats:
- **Social Media**: Use PNG files for best quality
- **Print**: Use original SVG files for scalability
- **Web**: PNG files optimized for each platform

### Brand Consistency:
- Always use the mermaid-themed hot pink color scheme
- Maintain the RW monogram as the primary logo
- Keep consistent messaging across platforms

## 🎯 Next Steps After Deployment

1. **Test Visibility**: Check how assets look on different screen sizes
2. **Brand Recognition**: Ensure consistent visual identity across platforms
3. **Update Documentation**: Add new assets to brand guidelines
4. **Performance Monitoring**: Track engagement with new branded content

---

**Export Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
**Total Assets**: $totalExports exported
**Status**: Ready for deployment! 🚀
"@

$deploymentGuide | Out-File -FilePath (Join-Path $outputDir "DEPLOYMENT_GUIDE.md") -Encoding UTF8

# Create a simple HTML preview page
$previewHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>RinaWarp Terminal - Marketing Assets Preview</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #0D1117; color: #fff; }
        .asset { margin: 20px 0; padding: 20px; background: #21262D; border-radius: 8px; }
        .asset h3 { color: #FF1493; margin-top: 0; }
        .asset img { max-width: 100%; height: auto; border: 1px solid #30363D; border-radius: 4px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <h1>🎨 RinaWarp Terminal - Marketing Assets</h1>
    <p>Professional brand assets ready for deployment across platforms.</p>
    
    <div class="asset">
        <h3>📱 Social Media Headers</h3>
        <div class="grid">
            <div>
                <h4>Twitter/X Header</h4>
                <img src="rinawarp-twitter-header.png" alt="Twitter Header">
            </div>
            <div>
                <h4>LinkedIn Cover</h4>
                <img src="rinawarp-linkedin-cover.png" alt="LinkedIn Cover">
            </div>
        </div>
    </div>
    
    <div class="asset">
        <h3>💻 Developer Platforms</h3>
        <div class="grid">
            <div>
                <h4>GitHub Banner</h4>
                <img src="rinawarp-github-banner.png" alt="GitHub Banner">
            </div>
            <div>
                <h4>YouTube Cover</h4>
                <img src="rinawarp-youtube-cover-hd.png" alt="YouTube Cover">
            </div>
        </div>
    </div>
    
    <div class="asset">
        <h3>👤 Profile Pictures</h3>
        <div class="grid">
            <div>
                <h4>Small (128px)</h4>
                <img src="rinawarp-profile-128.png" alt="Profile 128px">
            </div>
            <div>
                <h4>Medium (256px)</h4>
                <img src="rinawarp-profile-256.png" alt="Profile 256px">
            </div>
            <div>
                <h4>Large (512px)</h4>
                <img src="rinawarp-profile-512.png" alt="Profile 512px">
            </div>
        </div>
    </div>
    
    <p><strong>Status:</strong> ✅ All assets ready for deployment!</p>
    <p><em>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')</em></p>
</body>
</html>
"@

$previewHtml | Out-File -FilePath (Join-Path $outputDir "preview.html") -Encoding UTF8

# Summary
Write-Host "`n📊 Export Summary:" -ForegroundColor Magenta
Write-Host "=================" -ForegroundColor Magenta
Write-Host "Total exports attempted: $totalExports" -ForegroundColor White
Write-Host "Successful exports: $successfulExports" -ForegroundColor Green
Write-Host "Success rate: $([math]::Round(($successfulExports / $totalExports) * 100, 1))%" -ForegroundColor Cyan

if ($successfulExports -eq $totalExports) {
    Write-Host "`n🎉 All marketing assets exported successfully!" -ForegroundColor Green
    Write-Host "📁 Files saved to: $outputDir" -ForegroundColor Yellow
    Write-Host "📋 Deployment guide: $outputDir\DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
    Write-Host "🌐 Preview page: $outputDir\preview.html" -ForegroundColor Yellow
    Write-Host "`n🚀 Ready to deploy across all platforms!" -ForegroundColor Magenta
} else {
    Write-Host "`n⚠️ Some exports failed. Check the output above for details." -ForegroundColor Yellow
}

Write-Host "`n✨ Marketing assets export complete!" -ForegroundColor Magenta
"@

