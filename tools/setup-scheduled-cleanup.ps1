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

#!/usr/bin/env pwsh
# RinaWarp Terminal - Setup Scheduled Cleanup
# This script sets up automated cleanup tasks using Windows Task Scheduler

param(
    [string]$Frequency = "Weekly",  # Daily, Weekly, Monthly
    [string]$Time = "02:00",        # Time to run (24-hour format)
    [switch]$CleanupLevel = "Cache", # Cache, Logs, Deep, All
    [switch]$Remove,                 # Remove existing scheduled task
    [switch]$DryRun
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Task names
$TaskName = "RinaWarp-Terminal-Cleanup"
$TaskPath = "\RinaWarp\"

# Script paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CleanupScript = Join-Path $ScriptDir "cleanup.ps1"

function Remove-ScheduledCleanup {
    Write-ColorOutput "🗑️  Removing scheduled cleanup task..." $Yellow
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
        if ($task) {
            if (-not $DryRun) {
                Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
                Write-ColorOutput "✅ Scheduled cleanup task removed successfully" $Green
            } else {
                Write-ColorOutput "🔍 [DRY RUN] Would remove scheduled task '$TaskName'" $Yellow
            }
        } else {
            Write-ColorOutput "ℹ️  No scheduled cleanup task found" $Blue
        }
    } catch {
        Write-ColorOutput "❌ Error removing scheduled task: $($_.Exception.Message)" $Red
    }
}

function New-ScheduledCleanup {
    Write-ColorOutput "⏰ Setting up scheduled cleanup task..." $Green
    Write-ColorOutput "📅 Frequency: $Frequency at $Time" $Blue
    Write-ColorOutput "🧹 Cleanup Level: $CleanupLevel" $Blue
    Write-ColorOutput "📂 Script Location: $CleanupScript" $Blue
    
    # Check if cleanup script exists
    if (-not (Test-Path $CleanupScript)) {
        Write-ColorOutput "❌ Cleanup script not found at: $CleanupScript" $Red
        Write-ColorOutput "💡 Make sure cleanup.ps1 is in the same directory as this script" $Yellow
        return
    }
    
    if ($DryRun) {
        Write-ColorOutput "🔍 [DRY RUN] Would create scheduled task with above settings" $Yellow
        return
    }
    
    try {
        # Create task folder if it doesn't exist
        try {
            Get-ScheduledTask -TaskPath $TaskPath -ErrorAction Stop | Out-Null
        } catch {
            $null = New-ScheduledTaskFolder -TaskPath $TaskPath.TrimEnd('\') -ErrorAction SilentlyContinue
        }
        
        # Remove existing task if it exists
        $existingTask = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
            Write-ColorOutput "🔄 Removed existing scheduled task" $Yellow
        }
        
        # Create action
        $Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$CleanupScript`" -$CleanupLevel -Verbose"
        $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument $Arguments -WorkingDirectory $ScriptDir
        
        # Create trigger based on frequency
        switch ($Frequency.ToLower()) {
            "daily" {
                $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
            }
            "weekly" {
                $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
            }
            "monthly" {
                $Trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At $Time
            }
            default {
                Write-ColorOutput "❌ Invalid frequency: $Frequency. Use Daily, Weekly, or Monthly" $Red
                return
            }
        }
        
        # Create settings
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        # Create principal (run as current user)
        $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
        
        # Register the task
        Register-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automated cleanup for RinaWarp Terminal project"
        
        Write-ColorOutput "✅ Scheduled cleanup task created successfully!" $Green
        Write-ColorOutput "📋 Task Name: $TaskPath$TaskName" $Blue
        Write-ColorOutput "⏰ Next Run: $((Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath).Triggers[0].StartBoundary)" $Blue
        
    } catch {
        Write-ColorOutput "❌ Error creating scheduled task: $($_.Exception.Message)" $Red
        Write-ColorOutput "💡 Try running as Administrator if you encounter permission issues" $Yellow
    }
}

function Show-ScheduledTasks {
    Write-ColorOutput "📋 Current RinaWarp scheduled tasks:" $Green
    
    try {
        $tasks = Get-ScheduledTask -TaskPath $TaskPath -ErrorAction SilentlyContinue
        if ($tasks) {
            foreach ($task in $tasks) {
                $info = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath
                Write-ColorOutput "  📌 $($task.TaskName)" $Blue
                Write-ColorOutput "     State: $($task.State)" $Blue
                Write-ColorOutput "     Last Run: $($info.LastRunTime)" $Blue
                Write-ColorOutput "     Next Run: $($info.NextRunTime)" $Blue
            }
        } else {
            Write-ColorOutput "  ℹ️  No scheduled cleanup tasks found" $Blue
        }
    } catch {
        Write-ColorOutput "❌ Error retrieving scheduled tasks: $($_.Exception.Message)" $Red
    }
}

function Show-Help {
    Write-ColorOutput "⏰ RinaWarp Terminal - Scheduled Cleanup Setup" $Green
    Write-ColorOutput ""
    Write-ColorOutput "Usage: .\setup-scheduled-cleanup.ps1 [options]" $Blue
    Write-ColorOutput ""
    Write-ColorOutput "Options:" $Blue
    Write-ColorOutput "  -Frequency   Schedule frequency (Daily, Weekly, Monthly) [Default: Weekly]" $Yellow
    Write-ColorOutput "  -Time        Time to run in 24-hour format [Default: 02:00]" $Yellow
    Write-ColorOutput "  -CleanupLevel Cleanup level (Cache, Logs, Deep, All) [Default: Cache]" $Yellow
    Write-ColorOutput "  -Remove      Remove existing scheduled task" $Yellow
    Write-ColorOutput "  -DryRun      Show what would be done without making changes" $Yellow
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" $Blue
    Write-ColorOutput "  .\setup-scheduled-cleanup.ps1                    # Weekly cache cleanup at 2 AM" $Green
    Write-ColorOutput "  .\setup-scheduled-cleanup.ps1 -Frequency Daily   # Daily cache cleanup" $Green
    Write-ColorOutput "  .\setup-scheduled-cleanup.ps1 -CleanupLevel All  # Weekly full cleanup" $Green
    Write-ColorOutput "  .\setup-scheduled-cleanup.ps1 -Remove            # Remove scheduled task" $Green
    Write-ColorOutput "  .\setup-scheduled-cleanup.ps1 -DryRun            # Preview changes" $Green
}

# Main execution
Write-ColorOutput "⏰ RinaWarp Terminal - Scheduled Cleanup Setup" $Green
Write-ColorOutput "================================================" $Blue

# Check if running as admin for better task scheduling
if (-not (Test-AdminRights)) {
    Write-ColorOutput "⚠️  Not running as Administrator. Some features may be limited." $Yellow
    Write-ColorOutput "💡 For best results, run as Administrator" $Blue
}

if ($Remove) {
    Remove-ScheduledCleanup
} elseif ($args.Count -eq 0 -and -not $DryRun) {
    Show-Help
    Write-ColorOutput ""
    Show-ScheduledTasks
} else {
    New-ScheduledCleanup
    Write-ColorOutput ""
    Show-ScheduledTasks
}



