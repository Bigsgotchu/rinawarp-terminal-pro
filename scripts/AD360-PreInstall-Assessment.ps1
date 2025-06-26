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
# ManageEngine AD360 Pre-Installation Assessment Script
# This script performs a comprehensive assessment of the environment before AD360 installation

param(
    [string]$LogPath = "C:\Logs\AD360-Assessment-$(Get-Date -Format 'yyyy-MM-dd-HHmm').log"
)

# Ensure log directory exists
$logDir = Split-Path $LogPath -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Function to write to both console and log
function Write-LogMessage {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $LogPath -Value $logEntry
}

# Function to test prerequisites
function Test-Prerequisites {
    Write-LogMessage "=== SYSTEM PREREQUISITES CHECK ===" "INFO" "Cyan"
    
    # Check Windows version
    $os = Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion
    Write-LogMessage "Operating System: $($os.WindowsProductName) (Version: $($os.WindowsVersion))"
    
    # Check if Windows Server
    if ($os.WindowsProductName -like "*Server*") {
        Write-LogMessage "✓ Windows Server detected" "PASS" "Green"
    } else {
        Write-LogMessage "⚠ Warning: ManageEngine AD360 is recommended for Windows Server" "WARN" "Yellow"
    }
    
    # Check RAM
    $ram = [math]::Round((Get-ComputerInfo).TotalPhysicalMemory / 1GB, 2)
    Write-LogMessage "Total RAM: $ram GB"
    
    if ($ram -ge 8) {
        Write-LogMessage "✓ RAM meets recommended requirements (8GB+)" "PASS" "Green"
    } elseif ($ram -ge 4) {
        Write-LogMessage "⚠ RAM meets minimum requirements but upgrade recommended" "WARN" "Yellow"
    } else {
        Write-LogMessage "✗ Insufficient RAM (minimum 4GB required)" "FAIL" "Red"
    }
    
    # Check disk space
    $diskSpace = Get-Volume -DriveLetter C | Select-Object SizeRemaining
    $freeSpaceGB = [math]::Round($diskSpace.SizeRemaining / 1GB, 2)
    Write-LogMessage "Free disk space on C: drive: $freeSpaceGB GB"
    
    if ($freeSpaceGB -ge 50) {
        Write-LogMessage "✓ Sufficient disk space available" "PASS" "Green"
    } else {
        Write-LogMessage "✗ Insufficient disk space (minimum 50GB required)" "FAIL" "Red"
    }
    
    # Check .NET Framework
    try {
        $dotNetVersion = Get-ItemProperty "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" -Name Release -ErrorAction Stop
        $version = $dotNetVersion.Release
        
        if ($version -ge 461808) {  # .NET 4.7.2
            Write-LogMessage "✓ .NET Framework 4.7.2+ is installed" "PASS" "Green"
        } else {
            Write-LogMessage "✗ .NET Framework 4.7.2 or later required" "FAIL" "Red"
        }
    }
    catch {
        Write-LogMessage "✗ Unable to detect .NET Framework version" "FAIL" "Red"
    }
}

# Function to test Active Directory connectivity
function Test-ActiveDirectoryConnectivity {
    Write-LogMessage "=== ACTIVE DIRECTORY CONNECTIVITY CHECK ===" "INFO" "Cyan"
    
    try {
        # Import AD module
        Import-Module ActiveDirectory -ErrorAction Stop
        Write-LogMessage "✓ Active Directory PowerShell module loaded" "PASS" "Green"
        
        # Get domain information
        $domain = Get-ADDomain -ErrorAction Stop
        Write-LogMessage "Domain: $($domain.DNSRoot)"
        Write-LogMessage "Domain Functional Level: $($domain.DomainMode)"
        
        # Get forest information
        $forest = Get-ADForest -ErrorAction Stop
        Write-LogMessage "Forest: $($forest.Name)"
        Write-LogMessage "Forest Functional Level: $($forest.ForestMode)"
        
        # Get domain controllers
        $domainControllers = Get-ADDomainController -Filter * -ErrorAction Stop
        Write-LogMessage "Domain Controllers found: $($domainControllers.Count)"
        
        foreach ($dc in $domainControllers) {
            Write-LogMessage "  - $($dc.Name) ($($dc.Site))"
            
            # Test connectivity to each DC
            if (Test-Connection -ComputerName $dc.Name -Count 2 -Quiet) {
                Write-LogMessage "    ✓ Connectivity: OK" "PASS" "Green"
            } else {
                Write-LogMessage "    ✗ Connectivity: FAILED" "FAIL" "Red"
            }
            
            # Test LDAP port
            $ldapTest = Test-NetConnection -ComputerName $dc.Name -Port 389 -WarningAction SilentlyContinue
            if ($ldapTest.TcpTestSucceeded) {
                Write-LogMessage "    ✓ LDAP (389): OK" "PASS" "Green"
            } else {
                Write-LogMessage "    ✗ LDAP (389): FAILED" "FAIL" "Red"
            }
            
            # Test LDAPS port
            $ldapsTest = Test-NetConnection -ComputerName $dc.Name -Port 636 -WarningAction SilentlyContinue
            if ($ldapsTest.TcpTestSucceeded) {
                Write-LogMessage "    ✓ LDAPS (636): OK" "PASS" "Green"
            } else {
                Write-LogMessage "    ⚠ LDAPS (636): Not available (consider enabling for security)" "WARN" "Yellow"
            }
        }
        
    }
    catch {
        Write-LogMessage "✗ Active Directory connectivity test failed: $($_.Exception.Message)" "FAIL" "Red"
    }
}

# Function to check current user permissions
function Test-UserPermissions {
    Write-LogMessage "=== USER PERMISSIONS CHECK ===" "INFO" "Cyan"
    
    # Check if running as administrator
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($isAdmin) {
        Write-LogMessage "✓ Running with local administrator privileges" "PASS" "Green"
    } else {
        Write-LogMessage "✗ Local administrator privileges required for installation" "FAIL" "Red"
    }
    
    # Check domain admin privileges
    try {
        $domainAdmins = Get-ADGroupMember -Identity "Domain Admins" -ErrorAction Stop
        $currentUserSID = $currentUser.User.Value
        
        $isDomainAdmin = $domainAdmins.SID -contains $currentUserSID
        
        if ($isDomainAdmin) {
            Write-LogMessage "✓ Current user has Domain Admin privileges" "PASS" "Green"
        } else {
            Write-LogMessage "⚠ Domain Admin privileges recommended for initial setup" "WARN" "Yellow"
        }
    }
    catch {
        Write-LogMessage "⚠ Unable to verify Domain Admin privileges" "WARN" "Yellow"
    }
}

# Function to check network ports and services
function Test-NetworkRequirements {
    Write-LogMessage "=== NETWORK REQUIREMENTS CHECK ===" "INFO" "Cyan"
    
    # Test DNS resolution
    try {
        $dnsTest = Resolve-DnsName -Name $env:USERDNSDOMAIN -ErrorAction Stop
        Write-LogMessage "✓ DNS resolution working for domain: $env:USERDNSDOMAIN" "PASS" "Green"
    }
    catch {
        Write-LogMessage "✗ DNS resolution failed for domain" "FAIL" "Red"
    }
    
    # Check if common web ports are available locally
    $portsToCheck = @(8080, 8443, 9090, 9443)  # Common AD360 ports
    
    foreach ($port in $portsToCheck) {
        try {
            $socket = New-Object System.Net.Sockets.TcpClient
            $socket.Connect("localhost", $port)
            $socket.Close()
            Write-LogMessage "⚠ Port $port is already in use" "WARN" "Yellow"
        }
        catch {
            Write-LogMessage "✓ Port $port is available" "PASS" "Green"
        }
    }
}

# Function to check SQL Server availability
function Test-SQLServerRequirements {
    Write-LogMessage "=== SQL SERVER REQUIREMENTS CHECK ===" "INFO" "Cyan"
    
    # Check for SQL Server instances
    try {
        $sqlInstances = Get-Service -Name "MSSQL*" -ErrorAction SilentlyContinue
        
        if ($sqlInstances) {
            Write-LogMessage "✓ SQL Server instances found:" "PASS" "Green"
            foreach ($instance in $sqlInstances) {
                Write-LogMessage "  - $($instance.Name) ($($instance.Status))"
            }
        } else {
            Write-LogMessage "⚠ No SQL Server instances found - SQL Server Express will be installed with AD360" "WARN" "Yellow"
        }
    }
    catch {
        Write-LogMessage "⚠ Unable to check SQL Server status" "WARN" "Yellow"
    }
}

# Function to generate summary report
function Write-SummaryReport {
    Write-LogMessage "=== ASSESSMENT SUMMARY ===" "INFO" "Cyan"
    
    $logContent = Get-Content $LogPath
    $passCount = ($logContent | Where-Object { $_ -like "*[PASS]*" }).Count
    $warnCount = ($logContent | Where-Object { $_ -like "*[WARN]*" }).Count
    $failCount = ($logContent | Where-Object { $_ -like "*[FAIL]*" }).Count
    
    Write-LogMessage "Results Summary:"
    Write-LogMessage "  ✓ Passed: $passCount" "INFO" "Green"
    Write-LogMessage "  ⚠ Warnings: $warnCount" "INFO" "Yellow"
    Write-LogMessage "  ✗ Failed: $failCount" "INFO" "Red"
    
    if ($failCount -eq 0) {
        Write-LogMessage "\n✓ System appears ready for AD360 installation" "INFO" "Green"
    } else {
        Write-LogMessage "\n✗ Please address failed requirements before proceeding with installation" "INFO" "Red"
    }
    
    Write-LogMessage "\nDetailed log saved to: $LogPath"
}

# Main execution
try {
    Write-LogMessage "Starting ManageEngine AD360 Pre-Installation Assessment" "INFO" "Cyan"
    Write-LogMessage "Assessment started at: $(Get-Date)" "INFO"
    Write-LogMessage "Computer: $env:COMPUTERNAME"
    Write-LogMessage "User: $env:USERNAME"
    Write-LogMessage "Domain: $env:USERDOMAIN"
    Write-LogMessage ""
    
    Test-Prerequisites
    Write-LogMessage ""
    
    Test-ActiveDirectoryConnectivity
    Write-LogMessage ""
    
    Test-UserPermissions
    Write-LogMessage ""
    
    Test-NetworkRequirements
    Write-LogMessage ""
    
    Test-SQLServerRequirements
    Write-LogMessage ""
    
    Write-SummaryReport
    
    Write-LogMessage "\nAssessment completed at: $(Get-Date)" "INFO"
}
catch {
    Write-LogMessage "Assessment failed with error: $($_.Exception.Message)" "FAIL" "Red"
}


