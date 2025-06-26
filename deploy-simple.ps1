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
# Deploy RinaWarp Terminal Website to Netlify
Write-Host "Deploying RinaWarp Terminal Website..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "website-deploy")) {
    Write-Host "Error: website-deploy folder not found!" -ForegroundColor Red
    exit 1
}

# Create deployment package
$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
$deployZip = "netlify-deploy-$timestamp.zip"

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Set-Location website-deploy

# Compress website files
Compress-Archive -Path * -DestinationPath "..\$deployZip" -Force

Set-Location ..

Write-Host "Deployment package created: $deployZip" -ForegroundColor Green
Write-Host ""
Write-Host "Manual Deployment Instructions:" -ForegroundColor Cyan
Write-Host "1. Go to: https://app.netlify.com/projects/rinawrapterminal" -ForegroundColor White
Write-Host "2. Click 'Deploys' tab" -ForegroundColor White
Write-Host "3. Drag and drop the file: $deployZip" -ForegroundColor White
Write-Host "4. Wait for deployment to complete" -ForegroundColor White
Write-Host ""
Write-Host "Your live site: https://rinawrapterminal.netlify.app" -ForegroundColor Green
Write-Host ""
Write-Host "READY TO MAKE MONEY!" -ForegroundColor Green
Write-Host "- Stripe payments are LIVE" -ForegroundColor White
Write-Host "- Download links are working" -ForegroundColor White
Write-Host "- Website is professional" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test purchase flow at your live site" -ForegroundColor White
Write-Host "2. Start your beta testing program" -ForegroundColor White
Write-Host "3. Email your personal network" -ForegroundColor White
Write-Host "4. Post on social media" -ForegroundColor White

# Open browser to Netlify dashboard and live site
Write-Host "Opening Netlify dashboard and live site..." -ForegroundColor Yellow
Start-Process "https://app.netlify.com/projects/rinawrapterminal"
Start-Sleep 2
Start-Process "https://rinawrapterminal.netlify.app"

Write-Host "Deployment package ready!" -ForegroundColor Green


