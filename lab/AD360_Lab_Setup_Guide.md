# ManageEngine AD360 Lab Environment Setup Guide

## Overview
This guide helps you set up a complete lab environment for testing ManageEngine AD360 using virtual machines or cloud infrastructure.

## Lab Architecture Options

### Option 1: Local Hyper-V Lab
```
┌─────────────────────────────────────────────────────────────┐
│                    Host Machine (Windows 10/11)             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   DC01 (VM)     │  │   APP01 (VM)    │  │  Client01    │ │
│  │ Domain Controller│  │  AD360 Server   │  │   (VM)       │ │
│  │ Windows Server  │  │ Windows Server  │  │ Windows 10   │ │
│  │ 2019/2022       │  │ 2019/2022       │  │              │ │
│  │ RAM: 2GB        │  │ RAM: 8GB        │  │ RAM: 4GB     │ │
│  │ Storage: 60GB   │  │ Storage: 100GB  │  │ Storage: 60GB│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Option 2: Cloud Lab (Azure/AWS)
- Use cloud templates for rapid deployment
- Pre-configured Active Directory environments
- Scalable and cost-effective for testing

### Option 3: Docker Containers (Limited Testing)
- Lightweight option for basic functionality testing
- Limited AD integration capabilities

## Prerequisites for Lab Setup

### Hardware Requirements (Local Lab)
- **Host Machine**: 16GB+ RAM, 500GB+ storage
- **Virtualization**: Hyper-V, VMware, or VirtualBox
- **Network**: Isolated virtual network

### Software Requirements
- Windows Server 2019/2022 ISO files
- Windows 10/11 client ISO
- ManageEngine AD360 installer
- Virtual machine software

## Step-by-Step Lab Setup

### Phase 1: Infrastructure Preparation

#### 1.1 Virtual Network Configuration
```powershell
# Create isolated virtual switch (Hyper-V)
New-VMSwitch -Name "AD360-Lab" -SwitchType Internal

# Configure IP range: 192.168.100.0/24
# DC01: 192.168.100.10
# APP01: 192.168.100.20
# Client01: 192.168.100.30
```

#### 1.2 Virtual Machine Creation
```powershell
# Create Domain Controller VM
New-VM -Name "DC01" -MemoryStartupBytes 2GB -BootDevice VHD -NewVHDPath "C:\VMs\DC01\DC01.vhdx" -NewVHDSizeBytes 60GB -SwitchName "AD360-Lab"

# Create AD360 Server VM
New-VM -Name "APP01" -MemoryStartupBytes 8GB -BootDevice VHD -NewVHDPath "C:\VMs\APP01\APP01.vhdx" -NewVHDSizeBytes 100GB -SwitchName "AD360-Lab"

# Create Client VM
New-VM -Name "Client01" -MemoryStartupBytes 4GB -BootDevice VHD -NewVHDPath "C:\VMs\Client01\Client01.vhdx" -NewVHDSizeBytes 60GB -SwitchName "AD360-Lab"
```

### Phase 2: Domain Controller Setup (DC01)

#### 2.1 Basic Server Configuration
```powershell
# Set static IP
New-NetIPAddress -IPAddress 192.168.100.10 -PrefixLength 24 -InterfaceAlias "Ethernet"
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 127.0.0.1

# Set computer name
Rename-Computer -NewName "DC01" -Restart
```

#### 2.2 Active Directory Installation
```powershell
# Install AD DS Role
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# Create new forest
Install-ADDSForest -DomainName "ad360lab.local" -DomainNetbiosName "AD360LAB" -InstallDns -SafeModeAdministratorPassword (ConvertTo-SecureString "P@ssw0rd123!" -AsPlainText -Force) -Force
```

#### 2.3 DNS Configuration
```powershell
# Add reverse lookup zone
Add-DnsServerPrimaryZone -NetworkID "192.168.100.0/24" -ZoneFile "100.168.192.in-addr.arpa.dns"

# Create DNS records
Add-DnsServerResourceRecordA -ZoneName "ad360lab.local" -Name "app01" -IPv4Address "192.168.100.20"
Add-DnsServerResourceRecordA -ZoneName "ad360lab.local" -Name "client01" -IPv4Address "192.168.100.30"
```

### Phase 3: AD360 Server Setup (APP01)

#### 3.1 Server Preparation
```powershell
# Set static IP
New-NetIPAddress -IPAddress 192.168.100.20 -PrefixLength 24 -InterfaceAlias "Ethernet" -DefaultGateway 192.168.100.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 192.168.100.10

# Set computer name and join domain
Rename-Computer -NewName "APP01"
Add-Computer -DomainName "ad360lab.local" -Credential (Get-Credential) -Restart
```

#### 3.2 Prerequisites Installation
```powershell
# Install .NET Framework 4.8
Invoke-WebRequest -Uri "https://download.microsoft.com/download/2/d/1/2d1424d1-9e5b-4b41-b0f3-5a6a3b84ee45/ndp48-web.exe" -OutFile "C:\Temp\ndp48-web.exe"
Start-Process "C:\Temp\ndp48-web.exe" -ArgumentList "/quiet" -Wait

# Install SQL Server Express (if needed)
# Download from Microsoft and install
```

### Phase 4: Sample Data Creation

#### 4.1 Organizational Units
```powershell
# Create OUs
New-ADOrganizationalUnit -Name "Departments" -Path "DC=ad360lab,DC=local"
New-ADOrganizationalUnit -Name "IT" -Path "OU=Departments,DC=ad360lab,DC=local"
New-ADOrganizationalUnit -Name "HR" -Path "OU=Departments,DC=ad360lab,DC=local"
New-ADOrganizationalUnit -Name "Finance" -Path "OU=Departments,DC=ad360lab,DC=local"
New-ADOrganizationalUnit -Name "Sales" -Path "OU=Departments,DC=ad360lab,DC=local"
```

#### 4.2 Sample Users
```powershell
# Create sample users for testing
$users = @(
    @{Name="John.Smith"; DisplayName="John Smith"; Department="IT"; Title="IT Manager"},
    @{Name="Jane.Doe"; DisplayName="Jane Doe"; Department="HR"; Title="HR Specialist"},
    @{Name="Bob.Johnson"; DisplayName="Bob Johnson"; Department="Finance"; Title="Accountant"},
    @{Name="Alice.Wilson"; DisplayName="Alice Wilson"; Department="Sales"; Title="Sales Rep"}
)

foreach ($user in $users) {
    $ou = "OU=$($user.Department),OU=Departments,DC=ad360lab,DC=local"
    New-ADUser -Name $user.Name -DisplayName $user.DisplayName -UserPrincipalName "$($user.Name)@ad360lab.local" -SamAccountName $user.Name -Path $ou -Department $user.Department -Title $user.Title -AccountPassword (ConvertTo-SecureString "TempPass123!" -AsPlainText -Force) -Enabled $true
}
```

#### 4.3 Security Groups
```powershell
# Create department groups
$groups = @("IT_Users", "HR_Users", "Finance_Users", "Sales_Users", "IT_Admins", "HR_Managers")

foreach ($group in $groups) {
    New-ADGroup -Name $group -GroupScope Global -GroupCategory Security -Path "OU=Departments,DC=ad360lab,DC=local"
}

# Add users to groups
Add-ADGroupMember -Identity "IT_Users" -Members "John.Smith"
Add-ADGroupMember -Identity "HR_Users" -Members "Jane.Doe"
Add-ADGroupMember -Identity "Finance_Users" -Members "Bob.Johnson"
Add-ADGroupMember -Identity "Sales_Users" -Members "Alice.Wilson"
Add-ADGroupMember -Identity "IT_Admins" -Members "John.Smith"
```

## Testing Scenarios

### Scenario 1: User Management Testing
- Create/modify/delete users
- Bulk user operations
- Password resets
- Account lockouts and unlocks

### Scenario 2: Group Management Testing
- Security group creation
- Distribution list management
- Nested group scenarios
- Group membership changes

### Scenario 3: Audit Testing
- Failed login attempts
- Permission changes
- Administrative actions
- Policy violations

### Scenario 4: Self-Service Testing
- Password reset workflows
- Account unlock procedures
- User profile updates
- Request/approval processes

## Automation Scripts

### Lab Reset Script
```powershell
# Reset lab to clean state
$users = Get-ADUser -Filter {Name -like "Test.*"}
foreach ($user in $users) {
    Remove-ADUser -Identity $user -Confirm:$false
}

# Reset test groups
$testGroups = Get-ADGroup -Filter {Name -like "Test_*"}
foreach ($group in $testGroups) {
    Remove-ADGroup -Identity $group -Confirm:$false
}
```

### Test Data Generator
```powershell
# Generate test users for bulk operations
for ($i = 1; $i -le 100; $i++) {
    $username = "TestUser{0:D3}" -f $i
    $displayName = "Test User $i"
    
    New-ADUser -Name $username -DisplayName $displayName -UserPrincipalName "$username@ad360lab.local" -SamAccountName $username -Path "OU=IT,OU=Departments,DC=ad360lab,DC=local" -AccountPassword (ConvertTo-SecureString "TempPass123!" -AsPlainText -Force) -Enabled $true
}
```

## Monitoring and Logging

### Enable Audit Policies
```powershell
# Enable detailed auditing for testing
auditpol /set /category:"Account Logon" /success:enable /failure:enable
auditpol /set /category:"Account Management" /success:enable /failure:enable
auditpol /set /category:"Directory Service Access" /success:enable /failure:enable
auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable
auditpol /set /category:"Object Access" /success:enable /failure:enable
auditpol /set /category:"Policy Change" /success:enable /failure:enable
auditpol /set /category:"Privilege Use" /success:enable /failure:enable
auditpol /set /category:"System" /success:enable /failure:enable
```

## Troubleshooting Common Lab Issues

### Network Connectivity
```powershell
# Test network connectivity
Test-NetConnection -ComputerName "dc01.ad360lab.local" -Port 389
Test-NetConnection -ComputerName "dc01.ad360lab.local" -Port 636
Test-NetConnection -ComputerName "dc01.ad360lab.local" -Port 53
```

### DNS Resolution
```powershell
# Test DNS resolution
nslookup dc01.ad360lab.local
nslookup ad360lab.local
```

### Domain Join Issues
```powershell
# Reset computer account
Reset-ComputerMachinePassword -Credential (Get-Credential)
Test-ComputerSecureChannel -Repair
```

## Cleanup and Maintenance

### Snapshot Management
- Take snapshots before major testing
- Document snapshot purposes
- Regular cleanup of old snapshots

### Resource Monitoring
- Monitor VM resource usage
- Adjust VM resources as needed
- Clean up log files regularly

## Cost Optimization

### Local Lab
- Use checkpoints/snapshots for quick resets
- Shut down VMs when not in use
- Consider using differencing disks

### Cloud Lab
- Use auto-shutdown policies
- Right-size VM instances
- Use spot instances for testing
- Clean up resources after testing

## Next Steps

1. **Complete lab setup** using this guide
2. **Install AD360** following the main implementation guide
3. **Run test scenarios** to validate functionality
4. **Document findings** for production planning
5. **Plan production deployment** based on lab experience

---

**Lab Environment**: ad360lab.local  
**Administrator**: administrator@ad360lab.local  
**Domain**: AD360LAB  
**Network**: 192.168.100.0/24  

