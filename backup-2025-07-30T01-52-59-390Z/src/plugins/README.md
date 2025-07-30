# RinaWarp Terminal Plugin System

A comprehensive, secure, and extensible plugin architecture for the RinaWarp Terminal that enables community-driven development and customization.

## 🚀 Overview

The RinaWarp Terminal Plugin System is designed to be:
- **Secure**: Advanced sandboxing and security validation
- **Extensible**: Rich API for terminal, UI, and system integration
- **User-friendly**: Intuitive plugin manager UI with visual feedback
- **Community-driven**: Built-in rating, review, and sharing systems
- **Performance-optimized**: Monitoring and optimization tools

## 📁 Project Structure

```
src/plugins/
├── plugin-manager.js           # Core plugin management system
├── pluginSystem.js            # Legacy plugin system (for compatibility)
├── ui/
│   ├── plugin-manager-ui.js   # Enhanced plugin manager UI
│   └── plugin-manager-ui.css  # UI styling
├── tests/
│   ├── plugin-manager.test.js         # PluginManager tests
│   ├── plugin-security.test.js        # Security validation tests
│   ├── plugin-marketplace.test.js     # Marketplace tests
│   ├── jest.config.js                 # Jest configuration
│   └── test-setup.js                  # Test setup utilities
├── docs/
│   └── plugin-api.md                  # Complete API documentation
├── performance/
│   └── plugin-performance-monitor.js  # Performance monitoring
├── community/
│   └── plugin-community-manager.js    # Community features
└── README.md                          # This file
```

## 🔧 Core Components

### PluginManager
The heart of the system, managing:
- Plugin lifecycle (load, unload, execute)
- Secure sandboxing with VM2
- API provisioning and access control
- Event handling and communication

### PluginSecurity
Advanced security features:
- Code analysis and validation
- Permission system
- Path validation
- Network request filtering
- Dangerous pattern detection

### PluginMarketplace
Community marketplace integration:
- Plugin discovery and search
- Installation and updates
- Version management
- Trusted plugin verification

### PluginManagerUI
Rich user interface:
- Visual plugin management
- Search and filtering
- Settings configuration
- Plugin details and reviews
- Installation progress tracking

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install vm2 events
   ```

2. **Import the plugin system**:
   ```javascript
   import { PluginManager } from './src/plugins/plugin-manager.js';
   import { PluginManagerUI } from './src/plugins/ui/plugin-manager-ui.js';
   ```

3. **Initialize the system**:
   ```javascript
   const pluginManager = new PluginManager(terminalManager);
   const pluginUI = new PluginManagerUI(pluginManager);
   ```

## 🔐 Security Features

### Sandboxing
- **VM2 Integration**: Secure JavaScript execution environment
- **Resource Limits**: CPU, memory, and time constraints
- **API Restrictions**: Limited access to system resources
- **Permission System**: Granular control over plugin capabilities

### Code Analysis
- **Pattern Detection**: Identifies dangerous code patterns
- **Permission Validation**: Ensures declared permissions match usage
- **Network Filtering**: Whitelist-based domain restrictions
- **Path Validation**: Restricts file system access

### Security Levels
- **Trusted Plugins**: Enhanced permissions for verified publishers
- **Untrusted Plugins**: Strict sandboxing with minimal permissions
- **Development Mode**: Additional debugging and validation

## 📋 Plugin API

### Core Terminal Access
```javascript
// Write to terminal
RinaWarp.terminal.write('Hello World\n');

// Execute commands
await RinaWarp.terminal.execute('ls -la');

// Listen for output
RinaWarp.terminal.onOutput((output) => {
  console.log('Output:', output);
});
```

### UI Extensions
```javascript
// Add menu items
RinaWarp.ui.addMenuItem('My Action', callback);

// Show notifications
RinaWarp.ui.showNotification('Success!', 'success');

// Create panels
RinaWarp.ui.createPanel('my-panel', content);
```

### Storage & Events
```javascript
// Persistent storage
RinaWarp.storage.set('key', value);
const data = RinaWarp.storage.get('key');

// Event system
RinaWarp.events.on('terminal-command', handler);
RinaWarp.events.emit('custom-event', data);
```

For complete API documentation, see [Plugin API Documentation](docs/plugin-api.md).

## 🎨 UI Features

### Plugin Manager Interface
- **Tabbed Interface**: Installed, Marketplace, Settings
- **Search & Filter**: Find plugins quickly
- **Visual Cards**: Rich plugin information display
- **Action Buttons**: Install, uninstall, activate, deactivate
- **Settings Panel**: Configure plugin system behavior

### Responsive Design
- **Mobile-friendly**: Optimized for different screen sizes
- **Accessibility**: Keyboard navigation and screen reader support
- **Dark Theme**: Consistent with terminal aesthetics
- **Animations**: Smooth transitions and feedback

## 📊 Performance Monitoring

### Metrics Tracking
- **Initialization Time**: Plugin startup performance
- **Memory Usage**: RAM consumption monitoring
- **CPU Usage**: Processing overhead tracking
- **API Calls**: Request frequency analysis

### Optimization Suggestions
- **Automatic Analysis**: Performance issue detection
- **Recommendations**: Actionable optimization advice
- **Thresholds**: Configurable performance limits
- **Reporting**: Detailed performance reports

## 🌟 Community Features

### Rating & Reviews
- **5-Star Rating**: User feedback system
- **Written Reviews**: Detailed plugin feedback
- **Community Stats**: Popular and trending plugins
- **User Profiles**: Track contributions and preferences

### Sharing & Discovery
- **Plugin Recommendations**: Personalized suggestions
- **Popular Plugins**: Community favorites
- **Trending Plugins**: Recently popular items
- **Beta Program**: Early access to new features

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: System interaction testing
- **Security Tests**: Vulnerability validation
- **Performance Tests**: Load and stress testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=plugin-manager
npm test -- --testPathPattern=plugin-security
npm test -- --testPathPattern=plugin-marketplace

# Run with coverage
npm test -- --coverage
```

## 📈 Development Workflow

### Creating a Plugin
1. **Setup Structure**: Create plugin files and manifest
2. **Implement Logic**: Write plugin functionality
3. **Test Thoroughly**: Unit and integration testing
4. **Security Review**: Validate security practices
5. **Documentation**: API usage and examples
6. **Publish**: Submit to marketplace

### Plugin Development Tools
- **Debug Mode**: Enhanced logging and error reporting
- **Hot Reload**: Live plugin updates during development
- **Performance Profiling**: Built-in performance monitoring
- **Security Validation**: Real-time security checks

## 🔍 Troubleshooting

### Common Issues

**Plugin Not Loading**
- Check manifest.json syntax
- Verify required permissions
- Review console errors
- Validate plugin code

**Security Errors**
- Review dangerous patterns
- Check permission declarations
- Validate network requests
- Verify file system access

**Performance Issues**
- Monitor initialization time
- Check memory usage
- Review API call frequency
- Optimize heavy operations

### Debug Mode
Enable debug logging:
```javascript
const pluginManager = new PluginManager(terminalManager, {
  debug: true,
  verbose: true
});
```

## 📚 Examples

### Simple Plugin
```javascript
export default {
  name: 'hello-world',
  version: '1.0.0',
  description: 'A simple hello world plugin',
  
  async init() {
    RinaWarp.terminal.write('Hello from plugin!\n');
    RinaWarp.ui.showNotification('Plugin loaded!', 'success');
  },
  
  async cleanup() {
    console.log('Plugin unloaded');
  }
};
```

### Advanced Plugin
```javascript
export default {
  name: 'advanced-plugin',
  version: '1.0.0',
  
  async init() {
    // Add UI elements
    RinaWarp.ui.addMenuItem('Advanced Action', this.handleAction);
    
    // Listen for events
    RinaWarp.events.on('terminal-command', this.handleCommand);
    
    // Setup storage
    const config = RinaWarp.storage.get('config') || {};
    this.config = { ...this.defaultConfig, ...config };
  },
  
  handleAction() {
    // Custom functionality
  },
  
  handleCommand(command) {
    // Process terminal commands
  }
};
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **ESLint**: Follow established coding standards
- **Testing**: Maintain test coverage above 90%
- **Documentation**: Update docs for new features
- **Security**: Follow security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VM2** for secure JavaScript sandboxing
- **Jest** for comprehensive testing framework
- **Community** for feedback and contributions
- **Security Researchers** for vulnerability reports

## 📞 Support

- **Documentation**: [Plugin API Docs](docs/plugin-api.md)
- **Issues**: [GitHub Issues](https://github.com/rinawarp/terminal/issues)
- **Discussions**: [Community Forum](https://forum.rinawarp.com)
- **Email**: support@rinawarp.com

---

**Happy Plugin Development!** 🚀
