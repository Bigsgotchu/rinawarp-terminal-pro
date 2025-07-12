# Changelog

All notable changes to RinaWarp Terminal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2025-07-04

### Added
- Comprehensive auto-updater testing suite with mock functionality
- Manual update check functionality in application UI
- Proprietary licensing documentation (PROPRIETARY_NOTICE.md)
- Closed source transition checklist for maintainers

### Changed
- Updated electron-builder configuration to use GitHub provider for proper auto-updater functionality
- Improved auto-updater integration with manual update checks
- Enhanced error handling for update processes

### Fixed
- Resolved ENOENT error by removing dmg-license optional dependency
- Fixed logger import issues in renderer files
- Resolved import errors and linting issues in codebase
- Updated publish configuration to use correct GitHub repository details

### Technical
- All auto-updater tests now passing (19/19 tests)
- Improved test coverage for update functionality
- Code signing properly configured for Windows executables
- Updated dependencies to latest compatible versions

### Security
- Removed unused dependencies (brace-expansion, retire, @types packages)
- Updated electron-updater to version 6.6.2
- Cleaned up package.json dependencies

## [1.0.6] - 2025-07-02

### Added
- Railway-Vercel integration with automated environment sync
- Enhanced AI features and security integrations
- 20+ new themes and enhanced UI features

### Fixed
- Added missing download.html file and error handling
- Updated server.js for new Stripe price structure
- Improved HTML file paths for deployment

## [1.0.6-beta] - 2025-07-01

### Added
- Beta release with new features for testing
- Enhanced terminal emulation capabilities

## [1.0.2] - 2025-06-28

### Added
- Complete enterprise-grade AI terminal functionality
- Advanced terminal features and plugins
- Comprehensive testing suite

### Technical
- Initial stable release with full feature set
- Cross-platform compatibility (Windows, macOS, Linux)
- Professional UI with multiple themes

---

## Release Notes

### Version 1.0.7 Highlights

This release focuses on improving the auto-updater functionality and cleaning up the codebase:

- **Enhanced Auto-Updater**: Now properly configured to work with GitHub releases
- **Better Testing**: Comprehensive test suite for auto-updater functionality
- **Code Cleanup**: Removed unused dependencies and improved maintainability
- **Security**: Updated dependencies and removed potential security vulnerabilities

### Upgrade Notes

- No breaking changes in this release
- Existing installations will automatically update when the new version is available
- Manual update check is now available in the application menu

### Known Issues

- GitHub token authentication may require reconfiguration for automated publishing
- Some npm audit checks may fail due to network connectivity issues

### Download

- **Windows**: `RinaWarp Terminal Setup 1.0.7.exe` (125.6 MB)
- **Portable**: `RinaWarp Terminal 1.0.7.exe` (125.4 MB)

Both versions include auto-update functionality and are code-signed for security.

### Usage Examples

#### Auto-Updater Features
```javascript
// Manual update check (accessible via Help menu)
autoUpdater.checkForUpdatesAndNotify();

// Update events now properly handled
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
});
```

#### Developer Usage
```bash
# Test the auto-updater functionality
npm run test:auto-updater

# Build and publish with proper GitHub integration
npm run publish

# Run security checks
npm audit --audit-level=moderate
```

#### Configuration Changes
```json
// package.json - Updated electron-builder config
"publish": {
  "provider": "github",
  "owner": "Bigsgotchu",
  "repo": "rinawarp-terminal"
}
```
