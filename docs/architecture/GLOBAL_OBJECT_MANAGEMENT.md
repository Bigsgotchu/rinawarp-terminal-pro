# Global Object Management

The RinaWarp Terminal uses a sophisticated global object management system to handle service initialization, dependency resolution, and lifecycle management.

## Overview

The `GlobalObjectManager` is a singleton class that centrally manages all global objects in the application. It ensures proper initialization order, prevents conflicts, and provides clean resource management.

## Features

### Dependency Resolution
- **Topological Sorting**: Automatically resolves initialization order based on dependencies
- **Circular Dependency Detection**: Prevents infinite loops and provides clear error messages
- **Lazy Initialization**: Services are only initialized when first requested

### Lifecycle Management
- **Singleton Pattern**: Ensures only one instance of each service exists
- **Resource Cleanup**: Automatically calls cleanup methods on service shutdown
- **Error Handling**: Graceful handling of initialization failures

### Conflict Detection
- **Global Namespace Protection**: Prevents accidental overwrites of global objects
- **Access Tracking**: Monitors access patterns and detects conflicts
- **Side Effect Management**: Tracks and manages global side effects

## Usage

### Basic Registration

```javascript
import { globalObjectManager } from '@/utils/global-object-manager';

// Register a simple service
globalObjectManager.register('logger', async () => {
  return new Logger();
});

// Get the service (initializes if needed)
const logger = await globalObjectManager.get('logger');
```

### Advanced Configuration

```javascript
// Register a service with dependencies and configuration
globalObjectManager.register('databaseService', async () => {
  return new DatabaseService();
}, {
  dependencies: ['logger', 'config'],
  singleton: true,
  lazy: true,
  sideEffects: ['modifies_global_db_connection'],
  namespace: 'window'
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dependencies` | Array | `[]` | Services that must be initialized first |
| `singleton` | Boolean | `true` | Whether to reuse the same instance |
| `lazy` | Boolean | `true` | Whether to defer initialization until needed |
| `sideEffects` | Array | `[]` | List of side effects this service produces |
| `namespace` | String | `'window'` | Global namespace to expose the service |

## Architecture

### Core Components

#### GlobalObjectManager Class
- **Instance Management**: Maintains a registry of all services
- **Dependency Graph**: Builds and resolves dependency relationships
- **Initialization Queue**: Manages asynchronous initialization process

#### Dependency Resolution
```javascript
// Example dependency chain
logger ← config ← eventBus ← aiService ← terminalService
```

The manager automatically initializes services in the correct order:
1. `logger` (no dependencies)
2. `config` (depends on logger)
3. `eventBus` (depends on logger, config)
4. `aiService` (depends on logger, config, eventBus)
5. `terminalService` (depends on all previous)

### State Management

The manager maintains several internal maps:
- `globals`: Stores initialized service instances
- `initializers`: Stores service factory functions and configuration
- `dependencies`: Maps service names to their dependencies
- `initialized`: Tracks which services have been initialized
- `initializationPromises`: Manages concurrent initialization requests

## Real-World Examples

### Application Startup

```javascript
// Register core services
globalObjectManager.register('logger', async () => {
  return new Logger({
    level: process.env.LOG_LEVEL || 'info',
    output: 'console'
  });
});

globalObjectManager.register('config', async () => {
  const logger = await globalObjectManager.get('logger');
  return new ConfigService({ logger });
}, {
  dependencies: ['logger']
});

globalObjectManager.register('database', async () => {
  const config = await globalObjectManager.get('config');
  const logger = await globalObjectManager.get('logger');
  
  const db = new DatabaseService({
    url: config.get('database.url'),
    logger
  });
  
  await db.connect();
  return db;
}, {
  dependencies: ['logger', 'config'],
  sideEffects: ['database_connection']
});

// Initialize all services
await globalObjectManager.initializeAll();
```

### Plugin System Integration

```javascript
// Register a plugin system
globalObjectManager.register('pluginManager', async () => {
  const logger = await globalObjectManager.get('logger');
  const eventBus = await globalObjectManager.get('eventBus');
  
  const pluginManager = new PluginManager({ logger, eventBus });
  await pluginManager.loadPlugins();
  
  return pluginManager;
}, {
  dependencies: ['logger', 'eventBus'],
  sideEffects: ['loads_external_plugins', 'modifies_global_hooks']
});
```

### AI Service Integration

```javascript
// Register AI services with multiple providers
globalObjectManager.register('aiService', async () => {
  const config = await globalObjectManager.get('config');
  const logger = await globalObjectManager.get('logger');
  
  const aiService = new AIService({
    providers: {
      openai: config.get('ai.openai.enabled'),
      anthropic: config.get('ai.anthropic.enabled'),
      ollama: config.get('ai.ollama.enabled')
    },
    logger
  });
  
  await aiService.initialize();
  return aiService;
}, {
  dependencies: ['logger', 'config'],
  sideEffects: ['network_requests', 'api_connections']
});
```

## Error Handling

### Initialization Failures

```javascript
try {
  const service = await globalObjectManager.get('myService');
} catch (error) {
  if (error.message.includes('Circular dependency')) {
    // Handle circular dependency
    console.error('Circular dependency detected:', error.message);
  } else if (error.message.includes('not registered')) {
    // Handle missing service
    console.error('Service not found:', error.message);
  } else {
    // Handle initialization failure
    console.error('Service initialization failed:', error.message);
  }
}
```

### Cleanup on Failure

```javascript
// Services with cleanup methods
globalObjectManager.register('databaseService', async () => {
  const db = new DatabaseService();
  
  // Add cleanup method
  db.cleanup = async () => {
    await db.disconnect();
    console.log('Database connection closed');
  };
  
  return db;
});

// Cleanup all services on application shutdown
process.on('SIGTERM', async () => {
  await globalObjectManager.cleanup();
  process.exit(0);
});
```

## Monitoring and Debugging

### Status Information

```javascript
// Get detailed status
const status = globalObjectManager.getStatus();
console.log('Services:', {
  registered: status.registered,
  initialized: status.initialized,
  pending: status.pending,
  issues: status.issues
});
```

### Validation

```javascript
// Check for issues
const issues = globalObjectManager.validateGlobals();
issues.forEach(issue => {
  console.warn(`${issue.type}: ${issue.object} - ${issue.details}`);
});
```

### Access Tracking

```javascript
// Monitor service access patterns
const status = globalObjectManager.getStatus();
status.globalAccess.forEach(([name, data]) => {
  console.log(`${name}: accessed ${data.accessCount} times`);
});
```

## Best Practices

### Service Design
1. **Keep services focused**: Each service should have a single responsibility
2. **Declare dependencies explicitly**: Always specify what your service needs
3. **Implement cleanup methods**: Provide cleanup/shutdown methods for resource management
4. **Use async initialization**: All service factories should be async functions

### Dependency Management
1. **Minimize dependencies**: Only depend on what you actually need
2. **Avoid circular dependencies**: Design services to have clear hierarchies
3. **Use lazy loading**: Let services initialize only when needed
4. **Document side effects**: Clearly specify what global changes your service makes

### Error Handling
1. **Fail fast**: Throw clear errors during initialization
2. **Provide meaningful messages**: Include context in error messages
3. **Handle partial failures**: Design for resilience when some services fail
4. **Log initialization events**: Use proper logging for debugging

### Testing
1. **Mock dependencies**: Use the test setup to mock service dependencies
2. **Test initialization order**: Verify that services initialize in the correct order
3. **Test failure scenarios**: Ensure graceful handling of initialization failures
4. **Test cleanup**: Verify that cleanup methods are called properly

## Integration with Other Systems

### Electron Main Process

```javascript
// In main.cjs
import { globalObjectManager } from './src/utils/global-object-manager.js';

// Register Electron-specific services
globalObjectManager.register('windowManager', async () => {
  return new WindowManager();
});

globalObjectManager.register('menuManager', async () => {
  const windowManager = await globalObjectManager.get('windowManager');
  return new MenuManager({ windowManager });
}, {
  dependencies: ['windowManager']
});

// Initialize before creating windows
await globalObjectManager.initializeAll();
```

### Renderer Process

```javascript
// In renderer
import { globalObjectManager } from '@/utils/global-object-manager';

// Register UI services
globalObjectManager.register('terminalUI', async () => {
  return new TerminalUI();
});

globalObjectManager.register('themeManager', async () => {
  const terminalUI = await globalObjectManager.get('terminalUI');
  return new ThemeManager({ terminalUI });
}, {
  dependencies: ['terminalUI']
});
```

### Plugin Architecture

```javascript
// Plugin registration
class MyPlugin {
  static async register() {
    globalObjectManager.register('myPlugin', async () => {
      const logger = await globalObjectManager.get('logger');
      const eventBus = await globalObjectManager.get('eventBus');
      
      return new MyPlugin({ logger, eventBus });
    }, {
      dependencies: ['logger', 'eventBus']
    });
  }
}
```

## Migration Guide

### From Manual Initialization

**Before:**
```javascript
// Manual initialization (error-prone)
const logger = new Logger();
const config = new Config(logger);
const database = new Database(config, logger);
const aiService = new AIService(config, logger);
```

**After:**
```javascript
// Managed initialization
globalObjectManager.register('logger', async () => new Logger());
globalObjectManager.register('config', async () => {
  const logger = await globalObjectManager.get('logger');
  return new Config(logger);
}, { dependencies: ['logger'] });

await globalObjectManager.initializeAll();
```

### From Global Variables

**Before:**
```javascript
// Global variables (conflict-prone)
window.logger = new Logger();
window.config = new Config();
```

**After:**
```javascript
// Managed globals with conflict detection
globalObjectManager.register('logger', async () => new Logger());
globalObjectManager.register('config', async () => new Config());
```

This architecture provides a robust foundation for managing complex applications with multiple interdependent services, ensuring reliable initialization, proper resource management, and conflict-free global object handling.
