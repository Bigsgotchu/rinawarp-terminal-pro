# ManageEngine AD360 Implementation Guide

## Overview
ManageEngine AD360 is an integrated Active Directory management and security solution that provides:
- Active Directory management (ADManager Plus)
- Active Directory auditing (ADAudit Plus) 
- Active Directory self-service (ADSelfService Plus)
- Privileged access management (PAM360)
- Single sign-on (AD360)

## Prerequisites

### System Requirements
- Windows Server 2012 R2 or later
- Minimum 4GB RAM (8GB recommended)
- 50GB free disk space
- .NET Framework 4.7.2 or later
- Active Directory Domain Services
- SQL Server (Express/Standard/Enterprise)

### Network Requirements
- Domain controller access
- LDAP/LDAPS connectivity (ports 389/636)
- Kerberos authentication (port 88)
- DNS resolution for AD domains
- Web access (ports 80/443 for web console)

### Permissions Required
- Domain Admin privileges (for initial setup)
- Service account with appropriate AD permissions
- Local admin rights on installation server

## Implementation Steps

### Phase 1: Planning and Preparation

1. **Environment Assessment**
   ```powershell
   # Check AD environment
   Get-ADDomain
   Get-ADForest
   Get-ADDomainController -Filter *
   
   # Check system resources
   Get-ComputerInfo | Select-Object TotalPhysicalMemory, CsProcessors
   Get-Volume | Where-Object {$_.DriveLetter -eq 'C'}
   ```

2. **Service Account Creation**
   ```powershell
   # Create dedicated service account
   New-ADUser -Name "AD360Service" -UserPrincipalName "AD360Service@yourdomain.com" -Path "OU=Service Accounts,DC=yourdomain,DC=com" -AccountPassword (ConvertTo-SecureString "ComplexPassword123!" -AsPlainText -Force) -Enabled $true
   
   # Grant necessary permissions
   # Note: Specific permissions depend on modules being deployed
   ```

### Phase 2: Download and Installation

1. **Download AD360**
   - Visit ManageEngine website
   - Download AD360 installer
   - Verify installer integrity

2. **Installation Process**
   ```batch
   REM Run installer as administrator
   ManageEngineAD360.exe
   
   REM Follow installation wizard:
   REM - Accept license agreement
   REM - Choose installation directory
   REM - Configure database (SQL Server)
   REM - Set admin credentials
   REM - Configure service account
   ```

### Phase 3: Initial Configuration

1. **Domain Configuration**
   - Add Active Directory domains
   - Configure domain controllers
   - Set up trust relationships (if multi-domain)
   - Test connectivity

2. **Module Configuration**
   ```powershell
   # Configure each AD360 module:
   # - ADManager Plus (AD Management)
   # - ADAudit Plus (AD Auditing)
   # - ADSelfService Plus (Self-Service)
   # - PAM360 (Privileged Access)
   ```

### Phase 4: Security Configuration

1. **SSL/TLS Setup**
   ```powershell
   # Install SSL certificate
   Import-Certificate -FilePath "certificate.crt" -CertStoreLocation Cert:\LocalMachine\My
   
   # Configure HTTPS in AD360
   # Update web.config or use AD360 SSL configuration tool
   ```

2. **Authentication Setup**
   - Configure Active Directory authentication
   - Set up two-factor authentication (if required)
   - Configure role-based access control

### Phase 5: Module-Specific Setup

#### ADManager Plus Configuration
```powershell
# Configure organizational units
# Set up user templates
# Configure approval workflows
# Set up email notifications
```

#### ADAudit Plus Configuration
```powershell
# Configure audit policies
# Set up real-time monitoring
# Configure alerting rules
# Set up compliance reports
```

#### ADSelfService Plus Configuration
```powershell
# Configure self-service policies
# Set up password reset workflows
# Configure account unlock procedures
# Set up user enrollment
```

## Configuration Scripts

### Domain Controller Health Check
```powershell
# Save as: Check-DCHealth.ps1
function Test-DomainControllerHealth {
    param(
        [string[]]$DomainControllers
    )
    
    foreach ($DC in $DomainControllers) {
        Write-Host "Testing $DC..." -ForegroundColor Yellow
        
        # Test connectivity
        if (Test-Connection -ComputerName $DC -Count 2 -Quiet) {
            Write-Host "✓ $DC is reachable" -ForegroundColor Green
            
            # Test LDAP
            try {
                $ldap = New-Object System.DirectoryServices.DirectoryEntry("LDAP://$DC")
                $ldap.Name | Out-Null
                Write-Host "✓ LDAP connection successful" -ForegroundColor Green
            }
            catch {
                Write-Host "✗ LDAP connection failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "✗ $DC is not reachable" -ForegroundColor Red
        }
    }
}

# Usage
$DCs = (Get-ADDomainController -Filter *).Name
Test-DomainControllerHealth -DomainControllers $DCs
```

### Service Account Setup
```powershell
# Save as: Setup-AD360ServiceAccount.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountName,
    
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [SecureString]$Password
)

# Create service account
try {
    New-ADUser -Name $ServiceAccountName `
               -UserPrincipalName "$ServiceAccountName@$Domain" `
               -SamAccountName $ServiceAccountName `
               -AccountPassword $Password `
               -Enabled $true `
               -PasswordNeverExpires $true `
               -Description "Service account for ManageEngine AD360"
    
    Write-Host "✓ Service account created successfully" -ForegroundColor Green
    
    # Grant logon as service right
    # Note: Use Group Policy or local security policy to grant "Log on as a service" right
    
}
catch {
    Write-Host "✗ Failed to create service account: $($_.Exception.Message)" -ForegroundColor Red
}
```

## Post-Installation Tasks

1. **Testing and Validation**
   - Test all module functionality
   - Verify AD operations
   - Test reporting capabilities
   - Validate security controls

2. **Backup Configuration**
   ```powershell
   # Backup AD360 configuration
   # Location varies by installation
   Copy-Item -Path "C:\ManageEngine\AD360\conf" -Destination "C:\Backup\AD360-Config-$(Get-Date -Format 'yyyy-MM-dd')" -Recurse
   ```

3. **Monitoring Setup**
   - Configure log monitoring
   - Set up performance counters
   - Configure alerting

## Troubleshooting Common Issues

### Connection Issues
```powershell
# Test AD connectivity
Test-ComputerSecureChannel -Verbose

# Check DNS resolution
nslookup _ldap._tcp.yourdomain.com

# Test ports
Test-NetConnection -ComputerName dc.yourdomain.com -Port 389
Test-NetConnection -ComputerName dc.yourdomain.com -Port 636
```

### Permission Issues
```powershell
# Check service account permissions
Get-ADUser -Identity "AD360Service" -Properties MemberOf

# Verify delegation rights
# Use Active Directory Users and Computers console
```

## Security Best Practices

1. **Service Account Security**
   - Use strong, complex passwords
   - Enable account auditing
   - Regular password rotation
   - Minimal required permissions

2. **Network Security**
   - Use LDAPS (port 636) instead of LDAP (port 389)
   - Implement firewall rules
   - Network segmentation
   - VPN access for remote administration

3. **Application Security**
   - Enable HTTPS
   - Strong SSL/TLS configuration
   - Regular security updates
   - Security hardening

## Maintenance and Updates

1. **Regular Tasks**
   - Monitor logs daily
   - Review reports weekly
   - Update software monthly
   - Security assessment quarterly

2. **Backup Strategy**
   - Daily configuration backups
   - Weekly full system backups
   - Test restore procedures
   - Offsite backup storage

## Support and Documentation

- ManageEngine Support Portal
- Product Documentation
- Community Forums
- Professional Services

---

**Note**: This implementation guide provides a framework. Specific configurations will vary based on your Active Directory environment and organizational requirements. Always test in a lab environment before production deployment.

