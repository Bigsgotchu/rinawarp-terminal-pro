# RinaWarp Terminal - Enterprise Licensing Application Script
# Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
# CONFIDENTIAL AND PROPRIETARY

param(
    [string]$Path = ".",
    [switch]$WhatIf = $false
)

# Enterprise proprietary header template
$EnterpriseHeader = @"
/**
 * RinaWarp Terminal {0} - Enterprise Edition
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal Enterprise, an advanced commercial terminal emulator with
 * AI assistance, enterprise security, live collaboration, and revolutionary productivity features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * US Patent Application: US-2025-TERM-AI-001 (Filed: 2025)
 * International Patent Applications: PCT/US2025/TERM-AI
 * 
 * Licensed under RinaWarp Commercial Enterprise License.
 * This software is licensed, not sold. Use is subject to license terms.
 * See ENTERPRISE_LICENSE.txt for detailed terms and conditions.
 * 
 * Enterprise Features:
 * - Advanced AI Context Engine with Machine Learning
 * - Zero Trust Security Framework
 * - Enterprise SSO Integration (Active Directory, LDAP, SAML)
 * - Real-time Collaboration and Session Sharing
 * - Advanced Analytics and Compliance Reporting
 * - Priority Support and Custom Integrations
 * 
 * For enterprise licensing inquiries, contact: enterprise@rinawarp.com
 * Support: support@rinawarp.com | Phone: +1-800-RINAWARP
 */
"@

# Component name mappings for enterprise
$EnterpriseComponentNames = @{
    'main.js' = 'Core Engine'
    'renderer.js' = 'UI Engine'
    'ai-context-engine.js' = 'AI Intelligence Core'
    'performance-monitor.js' = 'Performance Analytics Engine'
    'workflow-automation.js' = 'Workflow Automation Suite'
    'enhanced-security.js' = 'Security Framework'
    'zero-trust-security.js' = 'Zero Trust Security Engine'
    'terminal-sharing.js' = 'Collaboration Engine'
    'next-gen-ui.js' = 'Next-Generation UI Framework'
    'index.html' = 'Enterprise Dashboard'
    'preload.js' = 'Security Bridge'
}

function Get-EnterpriseComponentName {
    param([string]$FileName)
    
    $BaseName = [System.IO.Path]::GetFileName($FileName)
    
    if ($EnterpriseComponentNames.ContainsKey($BaseName)) {
        return $EnterpriseComponentNames[$BaseName]
    }
    
    # Generate enterprise component name
    $Name = [System.IO.Path]::GetFileNameWithoutExtension($BaseName)
    $Name = $Name -replace '-', ' '
    $Name = (Get-Culture).TextInfo.ToTitleCase($Name)
    $Name += " Module"
    
    return $Name
}

function Update-FileToEnterprise {
    param([string]$FilePath)
    
    try {
        $Content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        if (-not $Content) {
            Write-Warning "File is empty: $FilePath"
            return
        }
        
        $ComponentName = Get-EnterpriseComponentName -FileName $FilePath
        $Header = $EnterpriseHeader -f $ComponentName
        
        # Remove existing copyright block
        $Pattern = '/\*\*[\s\S]*?\*/'
        $CleanContent = $Content -replace $Pattern, ''
        $CleanContent = $CleanContent.TrimStart()
        
        # Add enterprise header
        $NewContent = $Header + "`r`n" + $CleanContent
        
        if ($WhatIf) {
            Write-Host "Would update to Enterprise: $FilePath" -ForegroundColor Yellow
            Write-Host "Component: $ComponentName" -ForegroundColor Cyan
        } else {
            Set-Content -Path $FilePath -Value $NewContent -Encoding UTF8 -NoNewline
            Write-Host "Updated to Enterprise: $FilePath" -ForegroundColor Green
        }
        
    } catch {
        Write-Error "Failed to update $FilePath`: $($_.Exception.Message)"
    }
}

# Main execution
Write-Host "Applying Enterprise Licensing..." -ForegroundColor Cyan
Write-Host "Converting to RinaWarp Terminal Enterprise Edition" -ForegroundColor White
Write-Host ""

$FilePatterns = @("*.js", "*.ts", "*.html", "*.css")
$FilesToProcess = @()

foreach ($Pattern in $FilePatterns) {
    $Files = Get-ChildItem -Path $Path -Filter $Pattern -Recurse | Where-Object { 
        $_.FullName -notmatch 'node_modules|dist|.git' 
    }
    $FilesToProcess += $Files
}

Write-Host "Found $($FilesToProcess.Count) files to convert to Enterprise" -ForegroundColor Cyan
Write-Host ""

foreach ($File in $FilesToProcess) {
    Update-FileToEnterprise -FilePath $File.FullName
}

Write-Host ""
Write-Host "Enterprise licensing applied successfully!" -ForegroundColor Green
Write-Host "RinaWarp Terminal is now Enterprise Edition with commercial licensing" -ForegroundColor White

