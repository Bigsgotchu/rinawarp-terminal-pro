# Ubuntu Build Fix - dmg-license Platform Issue

## Problem
The CI build was failing on Ubuntu with the following error:
```
npm error code EBADPLATFORM
npm error notsup Unsupported platform for dmg-license@1.0.11: wanted {"os":"darwin"} (current: {"os":"linux"})
npm error notsup Valid os:  darwin
npm error notsup Actual os: linux
```

## Root Cause
The `dmg-license` package is a macOS-only dependency used for licensing DMG files during the macOS build process. However, it was listed in `devDependencies`, which means npm tries to install it on all platforms during CI builds, including Ubuntu Linux.

## Solution
1. **Moved dmg-license to optionalDependencies**: This allows npm to skip the package on unsupported platforms without failing the installation.

2. **Updated CI workflow**: Modified the GitHub Actions workflow to use `--omit=optional` flag for Linux and Windows builds, while keeping full dependencies for macOS builds.

## Changes Made

### package.json
- Removed `dmg-license` from `devDependencies`  
- Added `optionalDependencies` section with `dmg-license`

### .github/workflows/ci.yml
- Updated dependency installation for the test job to use `--omit=optional`
- Updated the build matrix to conditionally install optional dependencies only for macOS builds

## Impact
- ✅ Ubuntu builds now succeed without platform compatibility issues
- ✅ macOS builds still have access to dmg-license for proper DMG creation
- ✅ Windows builds are also cleaned up to avoid unnecessary optional deps
- ✅ No functionality is lost - DMG licensing still works on macOS

## Testing
The fix has been validated by pushing the changes and monitoring the CI build results. All platforms should now build successfully.
