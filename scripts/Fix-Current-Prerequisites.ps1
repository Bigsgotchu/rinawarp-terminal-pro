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
# AD360 Prerequisites Fixer for Current System
# This script addresses the issues found in the pre-installation assessment

param(
    [switch]$InstallADTools,
    [switch]$FixPermissions,
    [switch]$ShowSystemInfo,
    [switch]$CreateLabEnvironment,
    [string]$LogPath = "C:\Logs\AD360-Prerequisites-Fix-$(Get-Date -Format 'yyyy-MM-dd-HHmm').log"
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

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to install AD PowerShell module
function Install-ADPowerShellModule {
    Write-LogMessage "=== INSTALLING ACTIVE DIRECTORY POWERSHELL MODULE ===" "INFO" "Cyan"
    
    try {
        # Check if RSAT-AD-PowerShell is available
        $feature = Get-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools*"
        
        if ($feature) {
            Write-LogMessage "Installing RSAT Active Directory PowerShell module..." "INFO" "Yellow"
            
            # Install the capability
            Add-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0"
            
            Write-LogMessage "✓ RSAT Active Directory PowerShell module installed successfully" "PASS" "Green"
            
            # Try to import the module
            Import-Module ActiveDirectory -ErrorAction Stop
            Write-LogMessage "✓ Active Directory module imported successfully" "PASS" "Green"
        }
        else {
            Write-LogMessage "⚠ RSAT capability not found - may need to install differently on this OS version" "WARN" "Yellow"
            
            # Alternative method for Windows 10
            Write-LogMessage "Trying alternative installation method..." "INFO" "Yellow"
            
            # Try installing via PowerShell Gallery
            if (Get-Module -ListAvailable -Name PowerShellGet) {
                Install-Module -Name ActiveDirectory -Force -Scope CurrentUser -ErrorAction Stop
                Write-LogMessage "✓ Active Directory module installed via PowerShell Gallery" "PASS" "Green"
            }
        }
    }
    catch {
        Write-LogMessage "✗ Failed to install AD PowerShell module: $($_.Exception.Message)" "FAIL" "Red"
        Write-LogMessage "Manual installation required - please install RSAT tools manually" "INFO" "Yellow"
    }
}

# Function to fix permissions
function Set-AdminPermissions {
    Write-LogMessage "=== CHECKING AND FIXING PERMISSIONS ===" "INFO" "Cyan"
    
    if (Test-Administrator) {
        Write-LogMessage "✓ Already running with administrator privileges" "PASS" "Green"
        return $true
    }
    else {
        Write-LogMessage "✗ Not running as administrator" "FAIL" "Red"
        Write-LogMessage "To fix this issue:" "INFO" "Yellow"
        Write-LogMessage "1. Close this PowerShell window" "INFO" "White"
        Write-LogMessage "2. Right-click on PowerShell and select 'Run as Administrator'" "INFO" "White"
        Write-LogMessage "3. Re-run this script" "INFO" "White"
        
        # Offer to restart as admin
        $response = Read-Host "Would you like to restart this script as administrator? (Y/N)"
        if ($response -eq 'Y' -or $response -eq 'y') {
            Write-LogMessage "Restarting as administrator..." "INFO" "Yellow"
            $scriptPath = $MyInvocation.ScriptName
            $arguments = "-File `"$scriptPath`" -FixPermissions -InstallADTools"
            Start-Process PowerShell -Verb RunAs -ArgumentList $arguments
            exit
        }
        return $false
    }
}

# Function to show detailed system information
function Show-SystemInformation {
    Write-LogMessage "=== DETAILED SYSTEM INFORMATION ===" "INFO" "Cyan"
    
    try {
        $computerInfo = Get-ComputerInfo
        
        Write-LogMessage "Computer Name: $($computerInfo.CsName)"
        Write-LogMessage "Operating System: $($computerInfo.WindowsProductName)"
        Write-LogMessage "OS Version: $($computerInfo.WindowsVersion)"
        Write-LogMessage "OS Build: $($computerInfo.WindowsBuildLabEx)"
        Write-LogMessage "System Type: $($computerInfo.CsSystemType)"
        
        # Memory Information
        $totalRAM = [math]::Round($computerInfo.TotalPhysicalMemory / 1GB, 2)
        $availableRAM = [math]::Round($computerInfo.AvailablePhysicalMemory / 1GB, 2)
        Write-LogMessage "Total RAM: $totalRAM GB"
        Write-LogMessage "Available RAM: $availableRAM GB"
        
        # Processor Information
        Write-LogMessage "Processor: $($computerInfo.CsProcessors[0].Name)"
        Write-LogMessage "Processor Cores: $($computerInfo.CsProcessors[0].NumberOfCores)"
        Write-LogMessage "Logical Processors: $($computerInfo.CsProcessors[0].NumberOfLogicalProcessors)"
        
        # Domain Information
        Write-LogMessage "Domain: $($computerInfo.CsDomain)"
        Write-LogMessage "Workgroup: $($computerInfo.CsWorkgroup)"
        Write-LogMessage "Part of Domain: $($computerInfo.CsPartOfDomain)"
        
        # Disk Information
        $drives = Get-Volume | Where-Object {$_.DriveLetter -and $_.DriveType -eq 'Fixed'}
        foreach ($drive in $drives) {
            $freeSpaceGB = [math]::Round($drive.SizeRemaining / 1GB, 2)
            $totalSizeGB = [math]::Round($drive.Size / 1GB, 2)
            $usedPercentage = [math]::Round((($drive.Size - $drive.SizeRemaining) / $drive.Size) * 100, 1)
            Write-LogMessage "Drive $($drive.DriveLetter): $freeSpaceGB GB free of $totalSizeGB GB total ($usedPercentage% used)"
        }
        
        # .NET Framework Information
        try {
            $dotNetVersions = Get-ChildItem "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP" -Recurse |
                             Get-ItemProperty -Name Version -ErrorAction SilentlyContinue |
                             Where-Object { $_.PSChildName -match '^(?!S)\p{L}' } |
                             Select-Object PSChildName, Version
            
            Write-LogMessage ".NET Framework Versions Installed:"
            foreach ($version in $dotNetVersions) {
                Write-LogMessage "  - $($version.PSChildName): $($version.Version)"
            }
        }
        catch {
            Write-LogMessage "Unable to retrieve .NET Framework version information"
        }
        
        # PowerShell Version
        Write-LogMessage "PowerShell Version: $($PSVersionTable.PSVersion)"
        Write-LogMessage "PowerShell Edition: $($PSVersionTable.PSEdition)"
        
        # Windows Features
        Write-LogMessage "\nRelevant Windows Features:"
        $features = @(
            "IIS-*",
            "Microsoft-Hyper-V*",
            "Containers*",
            "VirtualMachinePlatform",
            "Microsoft-Windows-Subsystem-Linux"
        )
        
        foreach ($featurePattern in $features) {
            $installedFeatures = Get-WindowsOptionalFeature -Online | Where-Object { $_.FeatureName -like $featurePattern -and $_.State -eq "Enabled" }
            if ($installedFeatures) {
                foreach ($feature in $installedFeatures) {
                    Write-LogMessage "  ✓ $($feature.FeatureName): Enabled" "INFO" "Green"
                }
            }
        }
        
    }
    catch {
        Write-LogMessage "Error retrieving system information: $($_.Exception.Message)" "FAIL" "Red"
    }
}

# Function to create recommendations for lab environment
function New-LabEnvironmentRecommendations {
    Write-LogMessage "=== LAB ENVIRONMENT RECOMMENDATIONS ===" "INFO" "Cyan"
    
    Write-LogMessage "Based on your current system, here are recommendations for setting up an AD360 lab:"
    Write-LogMessage ""
    
    # Check if Hyper-V is available
    $hyperVFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue
    
    if ($hyperVFeature -and $hyperVFeature.State -eq "Enabled") {
        Write-LogMessage "✓ Hyper-V is available and enabled" "PASS" "Green"
        Write-LogMessage "Recommendation: Use local Hyper-V for lab environment" "INFO" "Green"
        
        Write-LogMessage "\nHyper-V Lab Setup Steps:"
        Write-LogMessage "1. Create virtual switch: New-VMSwitch -Name 'AD360-Lab' -SwitchType Internal"
        Write-LogMessage "2. Create DC VM: 2GB RAM, 60GB disk, Windows Server 2019/2022"
        Write-LogMessage "3. Create AD360 VM: 8GB RAM, 100GB disk, Windows Server 2019/2022"
        Write-LogMessage "4. Follow the lab setup guide for detailed configuration"
    }
    elseif ($hyperVFeature -and $hyperVFeature.State -eq "Disabled") {
        Write-LogMessage "⚠ Hyper-V is available but disabled" "WARN" "Yellow"
        Write-LogMessage "To enable Hyper-V: Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All"
        Write-LogMessage "Note: This requires a reboot"
    }
    else {
        Write-LogMessage "✗ Hyper-V is not available on this system" "FAIL" "Red"
        Write-LogMessage "Alternative options:"
        Write-LogMessage "1. VMware Workstation or VirtualBox"
        Write-LogMessage "2. Cloud-based lab (Azure, AWS)"
        Write-LogMessage "3. Physical machines for testing"
    }
    
    # Check for WSL
    $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
    
    if ($wslFeature -and $wslFeature.State -eq "Enabled") {
        Write-LogMessage "\n✓ WSL is available - can be used for Linux-based testing tools" "PASS" "Green"
    }
    
    # Docker recommendations
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-LogMessage "\n✓ Docker is available" "PASS" "Green"
        Write-LogMessage "Docker can be used for:"
        Write-LogMessage "- Test clients simulation"
        Write-LogMessage "- Monitoring tools"
        Write-LogMessage "- Development environments"
    }
    else {
        Write-LogMessage "\n⚠ Docker is not installed" "WARN" "Yellow"
        Write-LogMessage "Consider installing Docker Desktop for additional testing capabilities"
    }
    
    Write-LogMessage "\nCloud Lab Options:"
    Write-LogMessage "1. Azure: Use Azure AD DS and Windows VMs"
    Write-LogMessage "2. AWS: Use AWS Managed Microsoft AD and EC2 instances"
    Write-LogMessage "3. Google Cloud: Use Managed Service for Microsoft AD"
    
    Write-LogMessage "\nMinimal Lab Requirements:"
    Write-LogMessage "- Host Machine: 16GB RAM, 500GB storage"
    Write-LogMessage "- Domain Controller VM: 2GB RAM, 60GB disk"
    Write-LogMessage "- AD360 Server VM: 8GB RAM, 100GB disk"
    Write-LogMessage "- Client VM: 4GB RAM, 60GB disk"
}

# Function to create evaluation environment setup
function New-EvaluationEnvironment {
    Write-LogMessage "=== CREATING AD360 EVALUATION ENVIRONMENT ===" "INFO" "Cyan"
    
    Write-LogMessage "Setting up a minimal environment for AD360 evaluation on current system..."
    
    # Create evaluation directories
    $evalDir = "C:\AD360-Evaluation"
    $scriptsDir = "$evalDir\Scripts"
    $logsDir = "$evalDir\Logs"
    $configDir = "$evalDir\Config"
    
    try {
        New-Item -ItemType Directory -Path $evalDir -Force | Out-Null
        New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        
        Write-LogMessage "✓ Created evaluation directory structure" "PASS" "Green"
        
        # Create sample AD simulation script
        $simulationScript = @'
# AD360 Evaluation - Simulated AD Environment
# This script creates sample data for testing AD360 functionality

param(
    [int]$UserCount = 50,
    [int]$GroupCount = 10
)

Write-Host "Creating simulated AD environment for evaluation..." -ForegroundColor Cyan

# Simulate user data
$users = @()
for ($i = 1; $i -le $UserCount; $i++) {
    $user = [PSCustomObject]@{
        SamAccountName = "TestUser{0:D3}" -f $i
        DisplayName = "Test User $i"
        Email = "testuser{0:D3}@evaluation.local" -f $i
        Department = @("IT", "HR", "Finance", "Sales", "Marketing")[(Get-Random -Maximum 5)]
        Title = @("Manager", "Analyst", "Specialist", "Coordinator")[(Get-Random -Maximum 4)]
        Enabled = $true
        Created = (Get-Date).AddDays(-(Get-Random -Maximum 365))
    }
    $users += $user
}

# Simulate group data
$groups = @()
for ($i = 1; $i -le $GroupCount; $i++) {
    $group = [PSCustomObject]@{
        Name = "TestGroup{0:D2}" -f $i
        Description = "Test Security Group $i"
        Type = "Security"
        Members = @()
    }
    
    # Randomly assign users to groups
    $memberCount = Get-Random -Minimum 5 -Maximum 15
    $groupMembers = $users | Get-Random -Count $memberCount
    $group.Members = $groupMembers.SamAccountName
    
    $groups += $group
}

# Export data
$users | Export-Csv -Path "C:\AD360-Evaluation\Config\sample-users.csv" -NoTypeInformation
$groups | Export-Csv -Path "C:\AD360-Evaluation\Config\sample-groups.csv" -NoTypeInformation

Write-Host "Created $UserCount sample users and $GroupCount sample groups" -ForegroundColor Green
Write-Host "Data exported to C:\AD360-Evaluation\Config\" -ForegroundColor Green
'@
        
        $simulationScript | Out-File -FilePath "$scriptsDir\Create-SampleData.ps1" -Encoding UTF8
        Write-LogMessage "✓ Created sample data generation script" "PASS" "Green"
        
        # Create evaluation checklist
        $checklist = @'
# AD360 Evaluation Checklist

## Pre-Evaluation Setup
- [ ] Install AD360 trial version
- [ ] Configure basic settings
- [ ] Load sample data
- [ ] Set up test scenarios

## Core Functionality Testing
- [ ] User management operations
- [ ] Group management operations
- [ ] Password reset functionality
- [ ] Account unlock procedures
- [ ] Bulk operations
- [ ] Template creation

## Reporting and Auditing
- [ ] Generate user reports
- [ ] Generate group reports
- [ ] Test custom reports
- [ ] Audit log review
- [ ] Compliance reports

## Self-Service Portal
- [ ] Password reset portal
- [ ] Account unlock portal
- [ ] Profile update functionality
- [ ] Request workflows

## Integration Testing
- [ ] Email notifications
- [ ] LDAP connectivity (if available)
- [ ] Single sign-on
- [ ] API functionality

## Performance Testing
- [ ] Response time measurement
- [ ] Concurrent user simulation
- [ ] Large dataset handling
- [ ] Resource utilization monitoring

## Security Testing
- [ ] Access control verification
- [ ] Role-based permissions
- [ ] Audit trail completeness
- [ ] Data encryption verification

## Documentation Review
- [ ] Administrator documentation
- [ ] End-user documentation
- [ ] API documentation
- [ ] Troubleshooting guides
'@
        
        $checklist | Out-File -FilePath "$evalDir\Evaluation-Checklist.md" -Encoding UTF8
        Write-LogMessage "✓ Created evaluation checklist" "PASS" "Green"
        
        # Create README
        $readme = @'
# AD360 Evaluation Environment

This directory contains resources for evaluating ManageEngine AD360 on your current system.

## Directory Structure
- `Scripts/` - Utility scripts for evaluation
- `Logs/` - Log files and assessment results
- `Config/` - Configuration files and sample data

## Getting Started
1. Run `Scripts\Create-SampleData.ps1` to generate test data
2. Install AD360 trial version
3. Follow the evaluation checklist
4. Document findings in the Logs directory

## Limitations on Current System
- Limited Active Directory integration
- Simulated data environment
- Single-user testing
- No domain controller functionality

## Next Steps
Based on evaluation results:
1. Plan lab environment setup
2. Design production architecture
3. Prepare implementation timeline
4. Budget for infrastructure requirements
'@
        
        $readme | Out-File -FilePath "$evalDir\README.md" -Encoding UTF8
        Write-LogMessage "✓ Created evaluation README" "PASS" "Green"
        
        Write-LogMessage "\nEvaluation environment created at: $evalDir" "INFO" "Green"
        Write-LogMessage "Next steps:"
        Write-LogMessage "1. Download AD360 trial from ManageEngine"
        Write-LogMessage "2. Run Scripts\Create-SampleData.ps1 to generate test data"
        Write-LogMessage "3. Follow Evaluation-Checklist.md for systematic testing"
        
    }
    catch {
        Write-LogMessage "Error creating evaluation environment: $($_.Exception.Message)" "FAIL" "Red"
    }
}

# Main execution logic
Write-LogMessage "Starting AD360 Prerequisites Fixer" "INFO" "Cyan"
Write-LogMessage "Assessment started at: $(Get-Date)" "INFO"
Write-LogMessage "Computer: $env:COMPUTERNAME"
Write-LogMessage "User: $env:USERNAME"
Write-LogMessage ""

# Check administrator privileges first
if ($FixPermissions) {
    if (!(Set-AdminPermissions)) {
        Write-LogMessage "Cannot continue without administrator privileges" "FAIL" "Red"
        exit 1
    }
}

# Show detailed system information
if ($ShowSystemInfo) {
    Show-SystemInformation
    Write-LogMessage ""
}

# Install AD PowerShell module
if ($InstallADTools) {
    if (Test-Administrator) {
        Install-ADPowerShellModule
    }
    else {
        Write-LogMessage "Administrator privileges required to install AD tools" "WARN" "Yellow"
    }
    Write-LogMessage ""
}

# Create lab environment recommendations
if ($CreateLabEnvironment) {
    New-LabEnvironmentRecommendations
    Write-LogMessage ""
    
    # Ask if user wants to create evaluation environment
    $response = Read-Host "Would you like to create an evaluation environment on this system? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        New-EvaluationEnvironment
    }
}

# Summary and recommendations
Write-LogMessage "=== SUMMARY AND RECOMMENDATIONS ===" "INFO" "Cyan"

if (Test-Administrator) {
    Write-LogMessage "✓ Running with administrator privileges" "PASS" "Green"
}
else {
    Write-LogMessage "✗ Need administrator privileges for full functionality" "FAIL" "Red"
}

try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Write-LogMessage "✓ Active Directory PowerShell module is available" "PASS" "Green"
}
catch {
    Write-LogMessage "✗ Active Directory PowerShell module not available" "FAIL" "Red"
    Write-LogMessage "Run with -InstallADTools to attempt installation" "INFO" "Yellow"
}

Write-LogMessage "\nFor AD360 implementation:"
Write-LogMessage "1. Current System: Limited evaluation only"
Write-LogMessage "2. Lab Environment: Follow lab setup guide for full testing"
Write-LogMessage "3. Production: Use production deployment plan"

Write-LogMessage "\nLog saved to: $LogPath"
Write-LogMessage "Prerequisites fixing completed at: $(Get-Date)" "INFO"


