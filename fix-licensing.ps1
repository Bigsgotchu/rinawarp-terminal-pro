# Fix Licensing - Update all source files to MIT License
# Copyright (c) 2025 RinaWarp Technologies
# Licensed under the MIT License

param(
    [string]$Path = ".",
    [switch]$WhatIf = $false
)

# New MIT header template
$NewHeader = @"
/**
 * RinaWarp Terminal - {0}
 * Copyright (c) 2025 RinaWarp Technologies
 * 
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 * 
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * Project repository: https://github.com/rinawarp/terminal
 */
"@

# Files to process
$FilePatterns = @(
    "*.js",
    "*.ts",
    "*.html",
    "*.css"
)

# Component name mappings based on filename
$ComponentNames = @{
    'main.js' = 'Main Process'
    'renderer.js' = 'Main Renderer Process'
    'ai-context-engine.js' = 'AI Context Engine'
    'performance-monitor.js' = 'Performance Monitor'
    'workflow-automation.js' = 'Workflow Automation'
    'enhanced-security.js' = 'Enhanced Security'
    'zero-trust-security.js' = 'Zero Trust Security'
    'terminal-sharing.js' = 'Terminal Sharing'
    'next-gen-ui.js' = 'Next Generation UI'
    'index.html' = 'Main UI'
    'preload.js' = 'Preload Script'
}

function Get-ComponentName {
    param([string]$FileName)
    
    $BaseName = [System.IO.Path]::GetFileName($FileName)
    
    if ($ComponentNames.ContainsKey($BaseName)) {
        return $ComponentNames[$BaseName]
    }
    
    # Generate component name from filename
    $Name = [System.IO.Path]::GetFileNameWithoutExtension($BaseName)
    $Name = $Name -replace '-', ' '
    $Name = (Get-Culture).TextInfo.ToTitleCase($Name)
    
    return $Name
}

function Update-FileHeader {
    param(
        [string]$FilePath
    )
    
    try {
        $Content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        if (-not $Content) {
            Write-Warning "File is empty: $FilePath"
            return
        }
        
        $ComponentName = Get-ComponentName -FileName $FilePath
        $Header = $NewHeader -f $ComponentName
        
        # Remove existing copyright block (between /** and */)
        $Pattern = '/\*\*[\s\S]*?\*/'
        $CleanContent = $Content -replace $Pattern, ''
        
        # Remove leading whitespace/newlines
        $CleanContent = $CleanContent.TrimStart()
        
        # Combine new header with clean content
        $NewContent = $Header + "`r`n" + $CleanContent
        
        if ($WhatIf) {
            Write-Host "Would update: $FilePath" -ForegroundColor Yellow
            Write-Host "Component: $ComponentName" -ForegroundColor Cyan
        } else {
            Set-Content -Path $FilePath -Value $NewContent -Encoding UTF8 -NoNewline
            Write-Host "Updated: $FilePath" -ForegroundColor Green
        }
        
    } catch {
        Write-Error "Failed to update $FilePath`: $($_.Exception.Message)"
    }
}

# Main execution
Write-Host "Fixing licensing headers..." -ForegroundColor Cyan
Write-Host "Path: $Path" -ForegroundColor Gray
Write-Host "WhatIf: $WhatIf" -ForegroundColor Gray
Write-Host ""

$FilesToProcess = @()
foreach ($Pattern in $FilePatterns) {
    $Files = Get-ChildItem -Path $Path -Filter $Pattern -Recurse | Where-Object { 
        $_.FullName -notmatch 'node_modules|dist|.git' 
    }
    $FilesToProcess += $Files
}

Write-Host "Found $($FilesToProcess.Count) files to process" -ForegroundColor Cyan
Write-Host ""

foreach ($File in $FilesToProcess) {
    Update-FileHeader -FilePath $File.FullName
}

Write-Host ""
Write-Host "Licensing fix complete!" -ForegroundColor Green
Write-Host "All source files now use consistent MIT License headers" -ForegroundColor White

