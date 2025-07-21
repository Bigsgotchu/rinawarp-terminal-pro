# RinaWarp Terminal Beta - Known Issues

## Test Failures (Non-Critical)
1. **ElevenLabs Voice Integration Tests**
   - Some unit tests fail due to mock configuration
   - Actual functionality works correctly in the application
   - Will be fixed before public release

2. **Module Loading Tests**
   - Some integration tests fail due to test isolation issues
   - Does not affect runtime functionality

## Minor Issues
1. **Deprecated Modules**
   - Several non-core modules use deprecated dependencies
   - Scheduled for modernization before public release
   - No security vulnerabilities identified

2. **Voice Fallback**
   - ElevenLabs fallback to browser synthesis may have slight delays
   - Rina voice clips may not play in some browser environments

## Platform-Specific
1. **macOS**
   - Application name shows as "Electron.app" in first build
   - Manually rename or rebuild to fix

2. **Windows**
   - Code signing not yet configured
   - Windows Defender may flag as unknown app

3. **Linux**
   - AppImage packaging needs testing
   - Some voice features may require additional system packages

## API Integration
1. **API Keys**
   - Users must provide their own API keys for AI providers
   - No default keys included for security
   - Configuration UI provided for easy setup

## Performance
1. **Memory Usage**
   - Voice clip caching may use significant memory with extended use
   - Cache clearing mechanism available in settings

2. **Startup Time**
   - Initial startup may be slow due to module loading
   - Subsequent starts are faster

## Workarounds
- For test failures: Use `npm start` instead of `npm test` for running the app
- For voice issues: Check browser permissions for audio playback
- For API issues: Ensure valid API keys are configured in settings
