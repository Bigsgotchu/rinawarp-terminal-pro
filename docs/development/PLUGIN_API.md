# RinaWarp Terminal Plugin Development API

## Overview

RinaWarp Terminal provides a comprehensive plugin system that allows developers to extend terminal functionality with custom features. This guide covers the complete Plugin API for developing custom plugins.

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Getting Started](#getting-started)
3. [Core API Reference](#core-api-reference)
4. [Hook System](#hook-system)
5. [Plugin Configuration](#plugin-configuration)
6. [UI Components](#ui-components)
7. [Storage API](#storage-api)
8. [Examples](#examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Plugin Architecture

### Plugin Structure

```javascript
class MyPlugin {
    constructor(api) {
        this.api = api;
        this.name = 'my-plugin';
        this.version = '1.0.0';
        this.description = 'My custom plugin';
        this.author = 'Your Name';
        
        // Plugin configuration
        this.config = {
            enabled: true,
            settings: {
                // Default settings
            }
        };
        
        // Hook registrations
        this.hooks = {
            'terminal-created': this.onTerminalCreated.bind(this),
            'directory-changed': this.onDirectoryChanged.bind(this),
            'command-executed': this.onCommandExecuted.bind(this),
            'command-suggestion': this.onCommandSuggestion.bind(this),
            'theme-changed': this.onThemeChanged.bind(this),
            'plugin-loaded': this.onPluginLoaded.bind(this),
            'plugin-unloaded': this.onPluginUnloaded.bind(this)
        };
    }
    
    // Required: Initialize plugin
    async initialize() {
        // Plugin initialization logic
    }
    
    // Required: Cleanup plugin
    async destroy() {
        // Plugin cleanup logic
    }
}
```

### Plugin Lifecycle

1. **Construction**: Plugin class is instantiated
2. **Registration**: Hooks are registered with the plugin manager
3. **Initialization**: `initialize()` method is called
4. **Active**: Plugin responds to hooks and events
5. **Destruction**: `destroy()` method is called on unload

## Getting Started

### Creating Your First Plugin

1. Create a new JavaScript file in the `plugins/` directory:

```javascript
// plugins/hello-world.js
class HelloWorldPlugin {
    constructor(api) {
        this.api = api;
        this.name = 'hello-world';
        this.version = '1.0.0';
        this.description = 'A simple hello world plugin';
        
        this.hooks = {
            'terminal-created': this.onTerminalCreated.bind(this)
        };
    }
    
    async initialize() {
        console.log('Hello World Plugin initialized!');
    }
    
    async onTerminalCreated(terminalData) {
        this.api.terminal.writeToTerminal('Welcome to RinaWarp Terminal!\r\n');
    }
    
    async destroy() {
        console.log('Hello World Plugin destroyed!');
    }
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelloWorldPlugin;
}
```

2. Register the plugin in your terminal configuration or load it dynamically.

## Core API Reference

### Terminal API (`api.terminal`)

#### Methods

```javascript
// Write text to active terminal
api.terminal.writeToTerminal(text, terminalId?)

// Get current terminal instance
api.terminal.getCurrentTerminal()

// Get terminal by ID
api.terminal.getTerminal(terminalId)

// Create new terminal
api.terminal.createTerminal(options?)

// Close terminal
api.terminal.closeTerminal(terminalId)

// Execute command in terminal
api.terminal.executeCommand(command, terminalId?)

// Get terminal output history
api.terminal.getHistory(terminalId?)

// Clear terminal
api.terminal.clear(terminalId?)

// Resize terminal
api.terminal.resize(cols, rows, terminalId?)
```

### UI API (`api.ui`)

#### Methods

```javascript
// Show notification
api.ui.showNotification(message, type?, duration?)

// Show modal dialog
api.ui.showModal(title, content, options?)

// Add menu item
api.ui.addMenuItem(label, action, submenu?)

// Add toolbar button
api.ui.addToolbarButton(icon, tooltip, action)

// Add context menu item
api.ui.addContextMenuItem(label, action, condition?)

// Update status bar
api.ui.setStatusText(text, section?)

// Create custom panel
api.ui.createPanel(id, title, content, position?)
```

### Storage API (`api.storage`)

#### Methods

```javascript
// Store plugin data
api.storage.set(key, value, scope?)

// Retrieve plugin data
api.storage.get(key, defaultValue?, scope?)

// Remove plugin data
api.storage.remove(key, scope?)

// Clear all plugin data
api.storage.clear(scope?)

// Get all keys
api.storage.keys(scope?)
```

#### Storage Scopes
- `'global'`: Shared across all terminals
- `'terminal'`: Specific to current terminal
- `'session'`: Temporary, cleared on restart

### Settings API (`api.settings`)

#### Methods

```javascript
// Get setting value
api.settings.get(key, defaultValue?)

// Set setting value
api.settings.set(key, value)

// Register setting schema
api.settings.registerSchema(pluginName, schema)

// Get plugin settings
api.settings.getPluginSettings(pluginName)

// Update plugin settings
api.settings.updatePluginSettings(pluginName, settings)
```

### Commands API (`api.commands`)

#### Methods

```javascript
// Register command
api.commands.register(name, handler, description?)

// Unregister command
api.commands.unregister(name)

// Execute command
api.commands.execute(name, args?)

// Get command list
api.commands.list()

// Add command suggestion
api.commands.addSuggestion(pattern, suggestion, description?)
```

## Hook System

### Available Hooks

#### `terminal-created`
Triggered when a new terminal is created.

```javascript
async onTerminalCreated(data) {
    // data: { terminalId, terminal, shell, cwd }
}
```

#### `directory-changed`
Triggered when the working directory changes.

```javascript
async onDirectoryChanged(data) {
    // data: { terminalId, oldPath, newPath, files }
}
```

#### `command-executed`
Triggered after a command is executed.

```javascript
async onCommandExecuted(data) {
    // data: { terminalId, command, exitCode, output, duration }
}
```

#### `command-suggestion`
Provide command suggestions based on input.

```javascript
async onCommandSuggestion(data) {
    // data: { terminalId, input, cursor, context }
    // Return: { suggestions: [{ text, description, insertText? }] }
    return {
        suggestions: [
            { text: 'git status', description: 'Show repository status' }
        ]
    };
}
```

#### `theme-changed`
Triggered when the terminal theme changes.

```javascript
async onThemeChanged(data) {
    // data: { oldTheme, newTheme, colors }
}
```

#### `plugin-loaded` / `plugin-unloaded`
Triggered when plugins are loaded or unloaded.

```javascript
async onPluginLoaded(data) {
    // data: { pluginName, plugin }
}

async onPluginUnloaded(data) {
    // data: { pluginName }
}
```

## Plugin Configuration

### Settings Schema

```javascript
const settingsSchema = {
    type: 'object',
    properties: {
        enabled: {
            type: 'boolean',
            default: true,
            title: 'Enable Plugin',
            description: 'Enable or disable this plugin'
        },
        apiKey: {
            type: 'string',
            title: 'API Key',
            description: 'Your API key for external service',
            secret: true
        },
        maxSuggestions: {
            type: 'number',
            default: 5,
            minimum: 1,
            maximum: 20,
            title: 'Max Suggestions',
            description: 'Maximum number of suggestions to show'
        }
    }
};

// Register schema in initialize()
async initialize() {
    this.api.settings.registerSchema(this.name, settingsSchema);
}
```

## UI Components

### Creating Custom Panels

```javascript
// Create a custom side panel
const panel = this.api.ui.createPanel('my-panel', 'My Plugin Panel', `
    <div class=\"plugin-panel\">
        <h3>Plugin Controls</h3>
        <button id=\"my-action\">Perform Action</button>
        <div id=\"status\">Ready</div>
    </div>
`, 'right');

// Add event listeners
panel.querySelector('#my-action').addEventListener('click', () => {
    this.performAction();
});
```

### Adding Context Menu Items

```javascript
// Add context menu item that appears when right-clicking terminal
this.api.ui.addContextMenuItem('My Action', () => {
    this.performAction();
}, (context) => {
    // Only show if text is selected
    return context.hasSelection;
});
```

## Examples

### Git Status Plugin

```javascript
class GitStatusPlugin {
    constructor(api) {
        this.api = api;
        this.name = 'git-status';
        this.version = '1.0.0';
        
        this.hooks = {
            'directory-changed': this.updateGitStatus.bind(this),
            'command-executed': this.onCommandExecuted.bind(this)
        };
    }
    
    async initialize() {
        this.statusElement = this.api.ui.createPanel('git-status', 'Git Status', '
            <div id=\"git-info\">
                <div id=\"branch\">No repository</div>
                <div id=\"changes\"></div>
            </div>
        ', 'bottom');
    }
    
    async updateGitStatus(data) {
        try {
            const { execSync } = require('child_process');
            const branch = execSync('git branch --show-current', { 
                cwd: data.newPath,
                encoding: 'utf8' 
            }).trim();
            
            const status = execSync('git status --porcelain', {
                cwd: data.newPath,
                encoding: 'utf8'
            });
            
            this.updateUI(branch, status);
        } catch (error) {
            this.updateUI(null, null);
        }
    }
    
    updateUI(branch, status) {
        const branchElement = this.statusElement.querySelector('#branch');
        const changesElement = this.statusElement.querySelector('#changes');
        
        if (branch) {
            branchElement.textContent = `Branch: ${branch}`;
            const changes = status ? status.split('\n').filter(l => l.trim()).length : 0;
            changesElement.textContent = `Changes: ${changes}`;
        } else {
            branchElement.textContent = 'No repository';
            changesElement.textContent = '';
        }
    }
}
```

### Command Logger Plugin

```javascript
class CommandLoggerPlugin {
    constructor(api) {
        this.api = api;
        this.name = 'command-logger';
        this.version = '1.0.0';
        
        this.hooks = {
            'command-executed': this.logCommand.bind(this)
        };
        
        this.commandHistory = [];
    }
    
    async initialize() {
        // Load previous history
        this.commandHistory = await this.api.storage.get('history', []);
        
        // Add menu item to view history
        this.api.ui.addMenuItem('View Command History', () => {
            this.showHistory();
        });
    }
    
    async logCommand(data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            command: data.command,
            exitCode: data.exitCode,
            duration: data.duration,
            terminalId: data.terminalId
        };
        
        this.commandHistory.push(logEntry);
        
        // Keep only last 1000 commands
        if (this.commandHistory.length > 1000) {
            this.commandHistory = this.commandHistory.slice(-1000);
        }
        
        // Save to storage
        await this.api.storage.set('history', this.commandHistory);
    }
    
    showHistory() {
        const content = this.commandHistory
            .slice(-50)
            .reverse()
            .map(entry => `
                <div class=\"history-entry\">
                    <span class=\"timestamp\">${new Date(entry.timestamp).toLocaleString()}</span>
                    <span class=\"command\">${entry.command}</span>
                    <span class=\"exit-code ${entry.exitCode === 0 ? 'success' : 'error'}\">${entry.exitCode}</span>
                </div>
            `).join('');
            
        this.api.ui.showModal('Command History', `
            <div class=\"command-history\">
                ${content}
            </div>
        `);
    }
}
```

## Best Practices

### 1. Error Handling

```javascript
async onCommandExecuted(data) {
    try {
        // Your plugin logic here
    } catch (error) {
        console.error(`[${this.name}] Error:`, error);
        this.api.ui.showNotification(`Plugin error: ${error.message}`, 'error');
    }
}
```

### 2. Performance

- Use debouncing for frequent events
- Avoid heavy computations in hook handlers
- Cache expensive operations
- Clean up resources in `destroy()`

```javascript
const { debounce } = require('lodash');

this.debouncedUpdate = debounce(this.updateUI.bind(this), 300);
```

### 3. Settings Management

```javascript
async initialize() {
    // Load settings with defaults
    this.settings = await this.api.settings.getPluginSettings(this.name) || {
        enabled: true,
        refreshInterval: 5000
    };
}
```

### 4. Async Operations

```javascript
async onDirectoryChanged(data) {
    // Use Promise.race for timeouts
    try {
        await Promise.race([
            this.expensiveOperation(data.newPath),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            )
        ]);
    } catch (error) {
        console.warn('Operation timed out or failed:', error.message);
    }
}
```

## Troubleshooting

### Common Issues

1. **Plugin not loading**: Check console for syntax errors
2. **Hooks not firing**: Verify hook names and registration
3. **UI not updating**: Ensure DOM elements exist before manipulation
4. **Settings not persisting**: Use correct storage scope
5. **Memory leaks**: Clean up event listeners in `destroy()`

### Debug Mode

```javascript
// Enable debug logging
if (this.api.settings.get('debug', false)) {
    console.log(`[${this.name}] Debug:`, data);
}
```

### Plugin Testing

```javascript
// Add test command for development
if (process.env.NODE_ENV === 'development') {
    this.api.commands.register('test-plugin', () => {
        this.runTests();
    }, 'Run plugin tests');
}
```

## API Versioning

The Plugin API follows semantic versioning. Check compatibility:

```javascript
constructor(api) {
    this.api = api;
    
    // Check API version compatibility
    if (api.version.major !== 1) {
        throw new Error(`Plugin requires API v1.x, got v${api.version.full}`);
    }
}
```
---

## Support

For plugin development support:
- Check the [examples](examples/) directory
- Join our Discord community
- Create issues on GitHub for API requests

## Contributing

To contribute to the Plugin API:
1. Fork the repository
2. Create a feature branch
3. Add tests for new API features
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

