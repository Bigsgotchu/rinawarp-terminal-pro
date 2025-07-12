#!/usr/bin/env pwsh
# RinaWarp Release Creator
# Creates a release tag and triggers Firebase deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$Message = "Release version $Version"
)

Write-Host "🔥 Creating RinaWarp Release v$Version" -ForegroundColor Cyan

# Validate version format
if ($Version -notmatch '^v?\d+\.\d+\.\d+') {
    Write-Error "❌ Version must be in format: v1.0.0 or 1.0.0"
    exit 1
}

# Add 'v' prefix if not present
if (-not $Version.StartsWith('v')) {
    $Version = "v$Version"
}

try {
    # Create and push tag
    Write-Host "📦 Creating tag: $Version" -ForegroundColor Yellow
    git tag -a $Version -m "$Message"
    
    Write-Host "🚀 Pushing tag to origin..." -ForegroundColor Yellow
    git push origin $Version
    
    Write-Host "✅ Release $Version created successfully!" -ForegroundColor Green
    Write-Host "🌊 Firebase deployment will start automatically" -ForegroundColor Cyan
    Write-Host "🔗 Monitor at: https://github.com/Bigsgotchu/rinawarp-terminal/actions" -ForegroundColor Blue
    
} catch {
    Write-Error "❌ Failed to create release: $($_.Exception.Message)"
    exit 1
}
