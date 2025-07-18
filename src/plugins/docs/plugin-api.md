# RinaWarp Terminal Plugin API Documentation

## Overview

The RinaWarp Terminal Plugin System provides a secure, extensible architecture for extending terminal functionality through community-developed plugins. This document outlines the complete API available to plugin developers.

## Getting Started

### Plugin Structure

Every plugin must export a default object with the following structure:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  author: 'Your Name',
  
  // Required: Initialize the plugin
  async init() {
    // Plugin initialization code
  },
  
  // Optional: Cleanup when plugin is unloaded
  async cleanup() {
    // Plugin cleanup code
  }
};
```

### Plugin Manifest

Each plugin must include a `manifest.json` file:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "main": "plugin.js",
  "permissions": [
    "terminal:access",
    "ui:modify",
    "network:access",
    "filesystem:access"
  ],
  "dependencies": {
    "some-library": "^1.0.0"
  }
}
```

## API Reference

### Terminal API

Access terminal functionality through `RinaWarp.terminal`:

```javascript
// Write text to terminal
RinaWarp.terminal.write('Hello World\n');

// Execute a command
await RinaWarp.terminal.execute('ls -la');

// Listen for terminal output
RinaWarp.terminal.onOutput((output) => {
  console.log('Terminal output:', output);
});

// Get current directory
const currentDir = RinaWarp.terminal.getCurrentDirectory();

// Get command history
const history = RinaWarp.terminal.getHistory();
```

### UI API

Extend the terminal UI through `RinaWarp.ui`:

```javascript
// Add a menu item
RinaWarp.ui.addMenuItem('My Action', () => {
  console.log('Menu item clicked!');
});

// Add status bar item
RinaWarp.ui.addStatusBarItem('🔌 Plugin Active');

// Show notification
RinaWarp.ui.showNotification('Plugin loaded successfully!', 'success');

// Create a custom panel
RinaWarp.ui.createPanel('my-panel', `
  <div>
    <h3>My Plugin Panel</h3>
    <p>Custom content here</p>
  </div>
`);

// Add custom theme
RinaWarp.ui.addTheme('my-theme', {
  background: '#1a1a1a',
  foreground: '#ffffff',
  cursor: '#00ff00'
});
```

### Storage API

Persist plugin data through `RinaWarp.storage`:

```javascript
// Store data
RinaWarp.storage.set('myKey', { foo: 'bar' });

// Retrieve data
const data = RinaWarp.storage.get('myKey');

// Remove data
RinaWarp.storage.remove('myKey');
```

### Events API

Handle terminal events through `RinaWarp.events`:

```javascript
// Listen for terminal commands
RinaWarp.events.on('terminal-command', (command) => {
  console.log('Command executed:', command);
});

// Listen for directory changes
RinaWarp.events.on('terminal-directory-changed', (directory) => {
  console.log('Directory changed to:', directory);
});

// Emit custom events
RinaWarp.events.emit('my-plugin-event', { data: 'example' });

// Remove event listener
RinaWarp.events.off('terminal-command', myHandler);
```

### HTTP API

Make secure network requests through `RinaWarp.http`:

```javascript
// GET request
const response = await RinaWarp.http.get('https://api.example.com/data');

// POST request
const result = await RinaWarp.http.post('https://api.example.com/data', {
  name: 'test',
  value: 123
});

// PUT request
await RinaWarp.http.put('https://api.example.com/data/1', updateData);

// DELETE request
await RinaWarp.http.delete('https://api.example.com/data/1');
```

**Note**: HTTP requests are restricted to whitelisted domains for security.

### File System API

Access file system (restricted) through `RinaWarp.fs`:

```javascript
// Read file
const content = await RinaWarp.fs.readFile('/path/to/file.txt');

// Write file
await RinaWarp.fs.writeFile('/path/to/file.txt', 'Hello World');

// Check if file exists
const exists = await RinaWarp.fs.exists('/path/to/file.txt');

// Create directory
await RinaWarp.fs.mkdir('/path/to/directory');
```

**Note**: File system access is restricted to plugin directories for security.

### Utility API

Common utilities through `RinaWarp.utils`:

```javascript
// Debounce function
const debouncedFn = RinaWarp.utils.debounce(myFunction, 300);

// Throttle function
const throttledFn = RinaWarp.utils.throttle(myFunction, 100);

// Generate UUID
const id = RinaWarp.utils.uuid();

// Format date
const formatted = RinaWarp.utils.formatDate(new Date());
```

## Security and Permissions

### Permission System

Plugins must declare required permissions in their manifest:

- `terminal:access` - Read terminal output and execute commands
- `ui:modify` - Modify terminal UI elements
- `network:access` - Make HTTP requests (to whitelisted domains)
- `filesystem:access` - Access file system (restricted paths)

### Sandboxing

All plugins run in secure sandboxes with:
- Limited Node.js module access
- Restricted global object access
- Timeout protection (10 seconds)
- Memory limits
- Network request filtering

### Code Analysis

Plugin code is analyzed for potentially dangerous patterns:
- `eval()` usage
- `Function()` constructor
- `document.write()`
- `innerHTML` assignments
- Process execution functions

## Examples

### Simple Logger Plugin

```javascript
export default {
  name: 'terminal-logger',
  version: '1.0.0',
  description: 'Logs all terminal commands',
  author: 'Plugin Developer',
  
  async init() {
    console.log('Logger plugin initialized');
    
    // Listen for terminal commands
    RinaWarp.events.on('terminal-command', this.logCommand);
    
    // Add UI indicator
    RinaWarp.ui.addStatusBarItem('📝 Logger Active');
  },
  
  async cleanup() {
    RinaWarp.events.off('terminal-command', this.logCommand);
    console.log('Logger plugin cleaned up');
  },
  
  logCommand(command) {
    const timestamp = RinaWarp.utils.formatDate(new Date());
    const logEntry = `[${timestamp}] ${command}`;
    
    // Store in plugin storage
    const logs = RinaWarp.storage.get('commandLogs') || [];
    logs.push(logEntry);
    RinaWarp.storage.set('commandLogs', logs);
    
    console.log(logEntry);
  }
};
```

### File Explorer Plugin

```javascript
export default {
  name: 'file-explorer',
  version: '1.0.0',
  description: 'Visual file explorer panel',
  author: 'Plugin Developer',
  
  async init() {
    this.createExplorerPanel();
    this.bindEvents();
  },
  
  createExplorerPanel() {
    const panelContent = `
      <div id="file-explorer">
        <h3>File Explorer</h3>
        <div id="file-list"></div>
        <button id="refresh-btn">Refresh</button>
      </div>
    `;
    
    RinaWarp.ui.createPanel('file-explorer', panelContent);
    this.refreshFileList();
  },
  
  bindEvents() {
    // Listen for directory changes
    RinaWarp.events.on('terminal-directory-changed', () => {
      this.refreshFileList();
    });
  },
  
  async refreshFileList() {
    try {
      const currentDir = RinaWarp.terminal.getCurrentDirectory();
      
      // Execute ls command to get file list
      const output = await RinaWarp.terminal.execute('ls -la');
      
      // Parse and display files
      this.displayFiles(output);
    } catch (error) {
      console.error('Failed to refresh file list:', error);
    }
  },
  
  displayFiles(lsOutput) {
    const fileList = document.getElementById('file-list');
    const files = this.parseLsOutput(lsOutput);
    
    fileList.innerHTML = files.map(file => `
      <div class="file-item" data-name="${file.name}">
        <span class="file-type">${file.type}</span>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${file.size}</span>
      </div>
    `).join('');
    
    // Add click handlers for file navigation
    fileList.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', () => {
        const fileName = item.dataset.name;
        if (item.querySelector('.file-type').textContent === 'd') {
          RinaWarp.terminal.execute(`cd "${fileName}"`);
        }
      });
    });
  },
  
  parseLsOutput(output) {
    // Parse ls -la output into structured data
    return output.split('\n')
      .filter(line => line.trim() && !line.startsWith('total'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          permissions: parts[0],
          type: parts[0][0] === 'd' ? 'd' : 'f',
          name: parts.slice(8).join(' '),
          size: parts[4]
        };
      });
  }
};
```

## Best Practices

### Performance

1. **Minimize DOM manipulation** - Use efficient selectors and batch updates
2. **Debounce expensive operations** - Use `RinaWarp.utils.debounce()`
3. **Clean up resources** - Always implement the `cleanup()` method
4. **Avoid blocking operations** - Use async/await for I/O operations

### Security

1. **Validate inputs** - Always validate user inputs and external data
2. **Use safe DOM methods** - Avoid `innerHTML` when possible
3. **Limit network requests** - Only make necessary HTTP requests
4. **Handle errors gracefully** - Wrap operations in try-catch blocks

### User Experience

1. **Provide feedback** - Use notifications and status indicators
2. **Follow UI conventions** - Match the terminal's visual style
3. **Support keyboard shortcuts** - Enable power user workflows
4. **Test thoroughly** - Test with various terminal states and commands

## Plugin Publishing

### Development Workflow

1. Create plugin directory structure
2. Implement plugin functionality
3. Add comprehensive tests
4. Create documentation
5. Submit to plugin marketplace

### Marketplace Guidelines

1. **Code quality** - Follow JavaScript best practices
2. **Documentation** - Provide clear usage instructions
3. **Testing** - Include unit and integration tests
4. **Security** - Follow security best practices
5. **Compatibility** - Test with different terminal configurations

## Troubleshooting

### Common Issues

1. **Plugin not loading** - Check manifest.json syntax and permissions
2. **API calls failing** - Verify required permissions are declared
3. **Sandbox errors** - Check for restricted operations in code
4. **Memory issues** - Profile plugin performance and optimize

### Debug Mode

Enable debug mode in plugin development:

```javascript
export default {
  name: 'my-plugin',
  debug: true, // Enable debug logging
  
  async init() {
    if (this.debug) {
      console.log('Plugin debug mode enabled');
    }
  }
};
```

## Support

- **Documentation**: [https://docs.rinawarp.com/plugins](https://docs.rinawarp.com/plugins)
- **GitHub Issues**: [https://github.com/rinawarp/terminal/issues](https://github.com/rinawarp/terminal/issues)
- **Community Forum**: [https://forum.rinawarp.com](https://forum.rinawarp.com)
- **Plugin Marketplace**: [https://plugins.rinawarp.com](https://plugins.rinawarp.com)
