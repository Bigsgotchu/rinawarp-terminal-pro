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

# RinaWarp Terminal - Windows Installation Script
# Run this script as Administrator for system-wide installation

param(
    [switch]$User,
    [switch]$System,
    [switch]$Portable,
    [string]$InstallPath = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    RinaWarp Terminal Installer" -ForegroundColor Cyan
Write-Host "    Version 1.0.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Default installation paths
$DefaultUserPath = "$env:LOCALAPPDATA\RinaWarp Terminal"
$DefaultSystemPath = "$env:ProgramFiles\RinaWarp Terminal"
$SourcePath = "$PSScriptRoot\dist\win-unpacked"

# Determine installation type
if (-not $User -and -not $System -and -not $Portable) {
    Write-Host "Installation Options:" -ForegroundColor Yellow
    Write-Host "1. User installation (recommended)" -ForegroundColor White
    Write-Host "2. System-wide installation (requires admin)" -ForegroundColor White
    Write-Host "3. Portable installation" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Choose installation type (1-3)"
    } while ($choice -notin @('1', '2', '3'))
    
    switch ($choice) {
        '1' { $User = $true }
        '2' { $System = $true }
        '3' { $Portable = $true }
    }
}

# Set installation path
if ($Portable) {
    if (-not $InstallPath) {
        $InstallPath = Read-Host "Enter portable installation path (or press Enter for current directory)"
        if (-not $InstallPath) {
            $InstallPath = "$PWD\RinaWarp Terminal"
        }
    }
} elseif ($User) {
    $InstallPath = $DefaultUserPath
    Write-Host "Installing for current user..." -ForegroundColor Green
} elseif ($System) {
    # Check for admin privileges
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Host "System installation requires administrator privileges." -ForegroundColor Red
        Write-Host "Please run this script as Administrator or choose user installation." -ForegroundColor Red
        exit 1
    }
    $InstallPath = $DefaultSystemPath
    Write-Host "Installing system-wide..." -ForegroundColor Green
}

# Verify source files exist
if (-not (Test-Path $SourcePath)) {
    Write-Host "Error: Build files not found at $SourcePath" -ForegroundColor Red
    Write-Host "Please run 'npm run build' first to create the executable." -ForegroundColor Red
    exit 1
}

# Create installation directory
Write-Host "Creating installation directory: $InstallPath" -ForegroundColor Yellow
try {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
} catch {
    Write-Host "Error creating directory: $_" -ForegroundColor Red
    exit 1
}

# Copy files
Write-Host "Copying RinaWarp Terminal files..." -ForegroundColor Yellow
try {
    Copy-Item -Path "$SourcePath\*" -Destination $InstallPath -Recurse -Force
    Write-Host "Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error copying files: $_" -ForegroundColor Red
    exit 1
}

# Create shortcuts
if (-not $Portable) {
    Write-Host "Creating shortcuts..." -ForegroundColor Yellow
    
    # Desktop shortcut
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = "$DesktopPath\RinaWarp Terminal.lnk"
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = "$InstallPath\RinaWarp Terminal.exe"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Description = "RinaWarp Terminal - Advanced Open Source Terminal"
    $Shortcut.Save()
    
    # Start Menu shortcut
    if ($System) {
        $StartMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
    } else {
        $StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    }
    
    $StartMenuShortcut = "$StartMenuPath\RinaWarp Terminal.lnk"
    $StartMenuShortcutObj = $WScriptShell.CreateShortcut($StartMenuShortcut)
    $StartMenuShortcutObj.TargetPath = "$InstallPath\RinaWarp Terminal.exe"
    $StartMenuShortcutObj.WorkingDirectory = $InstallPath
    $StartMenuShortcutObj.Description = "RinaWarp Terminal - Advanced Open Source Terminal"
    $StartMenuShortcutObj.Save()
    
    Write-Host "Shortcuts created!" -ForegroundColor Green
}

# Add to PATH (optional)
if (-not $Portable) {
    $addToPath = Read-Host "Add RinaWarp Terminal to PATH? (y/n)"
    if ($addToPath -eq 'y' -or $addToPath -eq 'Y') {
        try {
            if ($System) {
                $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
                if ($currentPath -notlike "*$InstallPath*") {
                    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallPath", "Machine")
                    Write-Host "Added to system PATH!" -ForegroundColor Green
                }
            } else {
                $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
                if ($currentPath -notlike "*$InstallPath*") {
                    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallPath", "User")
                    Write-Host "Added to user PATH!" -ForegroundColor Green
                }
            }
        } catch {
            Write-Host "Warning: Could not add to PATH: $_" -ForegroundColor Yellow
        }
    }
}

# Create uninstaller
if (-not $Portable) {
    Write-Host "Creating uninstaller..." -ForegroundColor Yellow
    
    $UninstallScript = @"
# RinaWarp Terminal Uninstaller
Write-Host "Uninstalling RinaWarp Terminal..." -ForegroundColor Yellow

# Remove installation directory
if (Test-Path "$InstallPath") {
    Remove-Item "$InstallPath" -Recurse -Force
    Write-Host "Installation files removed." -ForegroundColor Green
}

# Remove shortcuts
if (Test-Path "$DesktopPath\RinaWarp Terminal.lnk") {
    Remove-Item "$DesktopPath\RinaWarp Terminal.lnk" -Force
}
if (Test-Path "$StartMenuShortcut") {
    Remove-Item "$StartMenuShortcut" -Force
}

# Remove from PATH
try {
    if ('$System' -eq 'True') {
        `$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        `$newPath = `$currentPath -replace [regex]::Escape(";$InstallPath"), ""
        [Environment]::SetEnvironmentVariable("Path", `$newPath, "Machine")
    } else {
        `$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        `$newPath = `$currentPath -replace [regex]::Escape(";$InstallPath"), ""
        [Environment]::SetEnvironmentVariable("Path", `$newPath, "User")
    }
    Write-Host "Removed from PATH." -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not remove from PATH." -ForegroundColor Yellow
}

Write-Host "RinaWarp Terminal has been uninstalled." -ForegroundColor Green
Pause
"@
    
    $UninstallScript | Out-File -FilePath "$InstallPath\Uninstall.ps1" -Encoding UTF8
    Write-Host "Uninstaller created at: $InstallPath\Uninstall.ps1" -ForegroundColor Green
}

# Installation complete
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "RinaWarp Terminal has been installed to:" -ForegroundColor White
Write-Host "$InstallPath" -ForegroundColor Cyan
Write-Host ""

if (-not $Portable) {
    Write-Host "You can now launch RinaWarp Terminal from:" -ForegroundColor White
    Write-Host "• Start Menu" -ForegroundColor Yellow
    Write-Host "• Desktop shortcut" -ForegroundColor Yellow
    if ($addToPath -eq 'y' -or $addToPath -eq 'Y') {
        Write-Host "• Command line: 'rinawarp-terminal' (restart terminal first)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Launch RinaWarp Terminal by running:" -ForegroundColor White
    Write-Host "\"$InstallPath\RinaWarp Terminal.exe\"" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Quick Start Tips:" -ForegroundColor Yellow
Write-Host "• Press Ctrl+, to open settings" -ForegroundColor White
Write-Host "• Right-click in terminal for context menu" -ForegroundColor White
Write-Host "• Use Ctrl+Shift+T for new tabs" -ForegroundColor White
Write-Host "• Check out the Quick Start guide: https://github.com/your-username/rinawarp-terminal/blob/main/QUICKSTART.md" -ForegroundColor White
Write-Host ""

# Offer to launch
$launch = Read-Host "Launch RinaWarp Terminal now? (y/n)"
if ($launch -eq 'y' -or $launch -eq 'Y') {
    Start-Process "$InstallPath\RinaWarp Terminal.exe"
}

Write-Host "Thank you for using RinaWarp Terminal!" -ForegroundColor Green



