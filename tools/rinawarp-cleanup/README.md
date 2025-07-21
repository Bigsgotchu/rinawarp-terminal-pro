# RinaWarp Developer Tools

This directory contains development tools for the RinaWarp project, including a cleanup utility and debug dashboard.

## Installation

```bash
cd tools/rinawarp-cleanup
npm install
npm link  # Makes the CLI tool globally available
```

## CLI Tool Usage

The `rinawarp-cleanup` tool provides several commands for managing the RinaWarp project:

### Cleanup Command

Clean temporary files and caches:

```bash
rinawarp-cleanup clean        # Basic cleanup
rinawarp-cleanup clean --all  # Deep cleanup including persistent caches
rinawarp-cleanup clean --cache-only  # Only clean cache files
```

### Configuration Management

Manage RinaWarp configuration:

```bash
rinawarp-cleanup config --list         # List all configuration
rinawarp-cleanup config --get <key>    # Get specific config value
rinawarp-cleanup config --set key=value  # Set config value
```

### Debug Dashboard

Launch the debug overlay dashboard:

```bash
rinawarp-cleanup debug           # Start on default port (3030)
rinawarp-cleanup debug -p 8080  # Start on specific port
```

## Configuration Manager

The `configManager.js` module provides a centralized configuration management system:

```javascript
const { ConfigManager } = require('../src/configManager');

const config = new ConfigManager();

// Get full configuration
const fullConfig = await config.getConfig();

// Get specific value
const value = await config.getValue('key.subkey');

// Set value
await config.setValue('key.subkey', 'value');

// Reset to defaults
await config.resetConfig();
```

### Configuration Schema

The configuration system uses the following schema:

```javascript
{
  cleanupPaths: string[],
  debugOverlay: {
    port: number,
    refreshInterval: number,
    enabledMetrics: string[]
  },
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug',
    file: string
  }
}
```

## Debug Dashboard

The debug dashboard provides real-time monitoring of:

- Module loading status
- Current configuration
- Error logs
- Performance metrics
- Mood-reactive UI controls

### Launching the Dashboard

The dashboard is accessible via web browser after starting:

1. Start the dashboard:
   ```bash
   rinawarp-cleanup debug
   ```

2. Open in browser:
   ```
   http://localhost:3030
   ```

### Dashboard Features

1. **Module Status**
   - Shows loaded, loading, and failed modules
   - Real-time updates
   - Visual status indicators

2. **Configuration Viewer**
   - Hierarchical configuration display
   - Real-time updates when config changes
   - Searchable interface

3. **Error Log Viewer**
   - Real-time error monitoring
   - Timestamp and error details
   - Error categorization

4. **Performance Metrics**
   - CPU usage
   - Memory utilization
   - System uptime
   - Custom metric support

5. **Mood-Reactive UI**
   - Multiple theme options
   - Dynamic UI adjustments
   - Customizable color schemes

### Development

To contribute to the development tools:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Start in development mode:
   ```bash
   npm run dev
   ```

### Architecture

The tools are built using:

- Commander.js for CLI
- Express.js for the debug server
- Socket.IO for real-time updates
- Winston for logging
- Conf for configuration management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details
