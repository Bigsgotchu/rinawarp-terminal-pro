#!/usr/bin/env pwsh
# RinaWarp Terminal - Copyright Protection Script
# Adds comprehensive copyright headers to all source files

param(
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

# Define the comprehensive copyright header for JavaScript/TypeScript files
$JSCopyrightHeader = @'
/**
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * U.S. Patent Application Filed: 2025
 * International Patent Applications: PCT, EU, CN, JP
 * 
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * For licensing inquiries, contact: licensing@rinawarp.com
 * 
 * @author RinaWarp Technologies
 * @copyright 2025 RinaWarp Technologies. All rights reserved.
 * @license RinaWarp Commercial License
 * @version 1.0.0
 * @since 2025-01-01
 */
'@

# Define copyright header for HTML files
$HTMLCopyrightHeader = @'
<!--
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * 
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * For licensing inquiries, contact: licensing@rinawarp.com
-->
'@

# Define copyright header for CSS files
$CSSCopyrightHeader = @'
/*
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * 
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * For licensing inquiries, contact: licensing@rinawarp.com
 */
'@

# Define copyright header for PowerShell files
$PSCopyrightHeader = @'
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
'@

function Add-CopyrightHeader {
    param(
        [string]$FilePath,
        [string]$Header,
        [switch]$DryRun
    )
    
    try {
        $content = Get-Content $FilePath -Raw -Encoding UTF8
        
        # Check if copyright header already exists
        if ($content -match "RinaWarp Technologies" -and !$Force) {
            Write-Host "✅ $FilePath - Copyright already present" -ForegroundColor Green
            return
        }
        
        # Add header at the beginning
        $newContent = $Header + "`n" + $content
        
        if ($DryRun) {
            Write-Host "📋 $FilePath - Would add copyright header" -ForegroundColor Yellow
        } else {
            Set-Content $FilePath -Value $newContent -Encoding UTF8
            Write-Host "✅ $FilePath - Copyright header added" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ $FilePath - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "🔒 RinaWarp Terminal - Copyright Protection Script" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
}

if ($Force) {
    Write-Host "⚠️ FORCE MODE - Will overwrite existing copyright headers" -ForegroundColor Yellow
}

Write-Host ""

# Find and process JavaScript/TypeScript files
$jsFiles = Get-ChildItem -Recurse -Include "*.js", "*.ts", "*.mjs" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*"
}

Write-Host "📄 Processing JavaScript/TypeScript files..." -ForegroundColor Cyan
foreach ($file in $jsFiles) {
    Add-CopyrightHeader -FilePath $file.FullName -Header $JSCopyrightHeader -DryRun:$DryRun
}

# Find and process HTML files
$htmlFiles = Get-ChildItem -Recurse -Include "*.html", "*.htm" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*"
}

Write-Host "`n🌐 Processing HTML files..." -ForegroundColor Cyan
foreach ($file in $htmlFiles) {
    Add-CopyrightHeader -FilePath $file.FullName -Header $HTMLCopyrightHeader -DryRun:$DryRun
}

# Find and process CSS files
$cssFiles = Get-ChildItem -Recurse -Include "*.css", "*.scss", "*.sass" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*"
}

Write-Host "`n🎨 Processing CSS files..." -ForegroundColor Cyan
foreach ($file in $cssFiles) {
    Add-CopyrightHeader -FilePath $file.FullName -Header $CSSCopyrightHeader -DryRun:$DryRun
}

# Find and process PowerShell files
$psFiles = Get-ChildItem -Recurse -Include "*.ps1", "*.psm1" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and $_.Name -ne "add-copyright.ps1"
}

Write-Host "`n💻 Processing PowerShell files..." -ForegroundColor Cyan
foreach ($file in $psFiles) {
    Add-CopyrightHeader -FilePath $file.FullName -Header $PSCopyrightHeader -DryRun:$DryRun
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN COMPLETE - Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "✅ COPYRIGHT PROTECTION COMPLETE" -ForegroundColor Green
    Write-Host "🔒 All source files now have comprehensive copyright headers" -ForegroundColor Green
}

Write-Host "💡 Tip: Run 'git add .' and 'git commit' to save your protected code" -ForegroundColor Cyan

