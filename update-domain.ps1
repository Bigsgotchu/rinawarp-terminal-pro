# RinaWarp Terminal - Domain Update Script
# Run this script after registering your domain to update all references

param(
    [Parameter(Mandatory=$true)]
    [string]$NewDomain,
    
    [Parameter(Mandatory=$false)]
    [string]$SalesEmail = "sales@$NewDomain"
)

Write-Host "🌐 Updating RinaWarp Terminal domain references..." -ForegroundColor Cyan
Write-Host "New domain: $NewDomain" -ForegroundColor Green
Write-Host "Sales email: $SalesEmail" -ForegroundColor Green

# List of files to update
$filesToUpdate = @(
    "src\renderer\renderer.js",
    "pricing.html",
    "package.json",
    "README.md",
    "src\renderer\workflow-automation.js",
    "src\license-manager.js"
)

# Domain replacements
$domainReplacements = @{
    "yourdomain\.com" = $NewDomain
    "rinawarp\.com" = $NewDomain
    "file://.*pricing\.html" = "https://$NewDomain/pricing"
}

# Email replacements
$emailReplacements = @{
    "sales@yourdomain\.com" = $SalesEmail
    "sales@rinawarp\.com" = $SalesEmail
}

$totalReplacements = 0

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        Write-Host "`n📝 Updating: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Apply domain replacements
        foreach ($pattern in $domainReplacements.Keys) {
            $replacement = $domainReplacements[$pattern]
            $content = $content -replace $pattern, $replacement
        }
        
        # Apply email replacements
        foreach ($pattern in $emailReplacements.Keys) {
            $replacement = $emailReplacements[$pattern]
            $content = $content -replace $pattern, $replacement
        }
        
        # Save if changed
        if ($content -ne $originalContent) {
            Set-Content $file $content -NoNewline
            $replacements = ($originalContent.Length - $content.Length + ($content -split "`n").Count - ($originalContent -split "`n").Count)
            Write-Host "   ✅ Updated with domain references" -ForegroundColor Green
            $totalReplacements++
        } else {
            Write-Host "   ⏭️  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  File not found: $file" -ForegroundColor Red
    }
}

# Update package.json with new homepage and repository
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $packageJson.homepage = "https://$NewDomain"
    
    # Update author email and URL if they exist
    if ($packageJson.author) {
        $packageJson.author.email = "support@$NewDomain"
        $packageJson.author.url = "https://$NewDomain"
    }
    
    # Add or update repository property
    if (-not $packageJson.repository) {
        $packageJson | Add-Member -Type NoteProperty -Name "repository" -Value @{}
    }
    if ($packageJson.repository -is [string]) {
        # If repository is a string, convert to object
        $packageJson.repository = @{
            "type" = "git"
            "url" = "https://github.com/rinawarp/terminal"
        }
    } else {
        # If repository is an object, ensure it has the url property
        if (-not $packageJson.repository.url) {
            $packageJson.repository | Add-Member -Type NoteProperty -Name "url" -Value "https://github.com/rinawarp/terminal"
        } else {
            $packageJson.repository.url = "https://github.com/rinawarp/terminal"
        }
        if (-not $packageJson.repository.type) {
            $packageJson.repository | Add-Member -Type NoteProperty -Name "type" -Value "git"
        }
    }
    
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Host "📦 Updated package.json homepage and repository" -ForegroundColor Green
}

Write-Host "`n🎉 Domain update complete!" -ForegroundColor Green
Write-Host "Files updated: $totalReplacements" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test your application locally" -ForegroundColor White
Write-Host "2. Commit changes to git" -ForegroundColor White
Write-Host "3. Deploy to your hosting provider" -ForegroundColor White
Write-Host "4. Configure DNS records" -ForegroundColor White

# Example usage help
Write-Host "`n💡 Usage examples:" -ForegroundColor Magenta
Write-Host ".\update-domain.ps1 -NewDomain 'rinawarp.com'" -ForegroundColor Gray
Write-Host ".\update-domain.ps1 -NewDomain 'rinawarp.dev' -SalesEmail 'contact@rinawarp.dev'" -ForegroundColor Gray
