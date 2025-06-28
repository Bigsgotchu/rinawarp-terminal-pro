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
# RinaWarp Terminal - Website Deployment Script
# Automates the preparation and deployment of your website

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("netlify", "vercel", "github", "prepare-only")]
    [string]$Platform = "prepare-only",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$UpdateDomain
)

Write-Host "🚀 RinaWarp Terminal Website Deployment" -ForegroundColor Cyan
Write-Host "Platform: $Platform" -ForegroundColor Green

# Create deployment directory
$deployDir = "deploy"
if (Test-Path $deployDir) {
    Write-Host "🗑️ Cleaning existing deploy directory..." -ForegroundColor Yellow
    Remove-Item $deployDir -Recurse -Force
}

Write-Host "📁 Creating deployment directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy website files
Write-Host "📋 Copying website files..." -ForegroundColor Yellow

# Copy main pricing page as index
if (Test-Path "pricing.html") {
    Copy-Item "pricing.html" "$deployDir\index.html"
    Write-Host "   ✅ pricing.html → index.html" -ForegroundColor Green
} else {
    Write-Host "   ❌ pricing.html not found!" -ForegroundColor Red
    exit 1
}

# Copy additional pages
$additionalPages = @("success.html", "test-stripe.html", "download.html")
foreach ($page in $additionalPages) {
    if (Test-Path $page) {
        Copy-Item $page $deployDir
        Write-Host "   ✅ $page" -ForegroundColor Green
    }
}

# Copy assets if they exist
if (Test-Path "assets") {
    Copy-Item "assets" $deployDir -Recurse
    Write-Host "   ✅ assets/" -ForegroundColor Green
}

# Create a simple robots.txt
$robotsTxt = @"
User-agent: *
Allow: /

Sitemap: https://$Domain/sitemap.xml
"@
$robotsTxt | Out-File "$deployDir\robots.txt" -Encoding UTF8
Write-Host "   ✅ robots.txt" -ForegroundColor Green

# Create a simple sitemap.xml
$sitemapXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://$Domain/</loc>
        <lastmod>$(Get-Date -Format "yyyy-MM-dd")</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://$Domain/download</loc>
        <lastmod>$(Get-Date -Format "yyyy-MM-dd")</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
"@
$sitemapXml | Out-File "$deployDir\sitemap.xml" -Encoding UTF8
Write-Host "   ✅ sitemap.xml" -ForegroundColor Green

# Create _redirects file for Netlify
$redirects = @"
# RinaWarp Terminal Redirects
/pricing     /           301
/download    /download.html    200
/success     /success.html     200

# API endpoints (if you add backend later)
/api/*       https://api.$Domain/:splat   200

# Fallback for SPA routing
/*           /index.html       200
"@
$redirects | Out-File "$deployDir\_redirects" -Encoding UTF8 -NoNewline
Write-Host "   ✅ _redirects (Netlify)" -ForegroundColor Green

# Create .htaccess for Apache servers
$htaccess = @"
# RinaWarp Terminal Apache Configuration

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</IfModule>

# Cache static resources
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Redirects
Redirect 301 /pricing /
"@
$htaccess | Out-File "$deployDir\.htaccess" -Encoding UTF8
Write-Host "   ✅ .htaccess (Apache)" -ForegroundColor Green

Write-Host "`n📊 Deployment Summary:" -ForegroundColor Cyan
$files = Get-ChildItem $deployDir -Recurse
Write-Host "Files prepared: $($files.Count)" -ForegroundColor White
Write-Host "Total size: $([math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1KB, 2)) KB" -ForegroundColor White

if ($Platform -eq "prepare-only") {
    Write-Host "`n✅ Files prepared in '$deployDir' directory!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Choose a hosting platform (netlify, vercel, github)" -ForegroundColor White
    Write-Host "2. Run: .\deploy-website.ps1 -Platform netlify -Domain yourdomain.com" -ForegroundColor White
    Write-Host "3. Or manually upload the '$deployDir' folder to your hosting provider" -ForegroundColor White
    return
}

# Platform-specific deployment
switch ($Platform) {
    "netlify" {
        Write-Host "`n🌐 Deploying to Netlify..." -ForegroundColor Cyan
        
        # Check if Netlify CLI is installed
        try {
            & netlify --version | Out-Null
        } catch {
            Write-Host "❌ Netlify CLI not found. Installing..." -ForegroundColor Red
            npm install -g netlify-cli
        }
        
        # Deploy to Netlify
        Set-Location $deployDir
        & netlify deploy --prod
        Set-Location ..
        
        Write-Host "✅ Deployed to Netlify!" -ForegroundColor Green
    }
    
    "vercel" {
        Write-Host "`n⚡ Deploying to Vercel..." -ForegroundColor Cyan
        
        # Check if Vercel CLI is installed
        try {
            & vercel --version | Out-Null
        } catch {
            Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
            npm install -g vercel
        }
        
        # Deploy to Vercel
        Set-Location $deployDir
        & vercel --prod
        Set-Location ..
        
        Write-Host "✅ Deployed to Vercel!" -ForegroundColor Green
    }
    
    "github" {
        Write-Host "`n🐙 Preparing for GitHub Pages..." -ForegroundColor Cyan
        
        # Create gh-pages branch preparation
        Write-Host "Manual steps for GitHub Pages:" -ForegroundColor Yellow
        Write-Host "1. Push this repository to GitHub" -ForegroundColor White
        Write-Host "2. Go to repository Settings > Pages" -ForegroundColor White
        Write-Host "3. Select source: Deploy from a branch" -ForegroundColor White
        Write-Host "4. Select branch: main, folder: /deploy" -ForegroundColor White
        Write-Host "5. Your site will be available at: https://username.github.io/repository-name" -ForegroundColor White
    }
}

Write-Host "`n🎉 Deployment process complete!" -ForegroundColor Green
Write-Host "`nPost-deployment checklist:" -ForegroundColor Yellow
Write-Host "☐ Test website functionality" -ForegroundColor White
Write-Host "☐ Configure custom domain in hosting platform" -ForegroundColor White
Write-Host "☐ Set up SSL certificate (usually automatic)" -ForegroundColor White
Write-Host "☐ Configure DNS records" -ForegroundColor White
Write-Host "☐ Test email forwarding" -ForegroundColor White
Write-Host "☐ Set up analytics (Google Analytics, etc.)" -ForegroundColor White

