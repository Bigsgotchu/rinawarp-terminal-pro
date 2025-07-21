# Process Lifecycle Manager Integration Guide

This guide shows how to integrate the enhanced process lifecycle management system into your RinaWarp terminal.

## Overview

The integration consists of three main components:

1. **ProcessLifecycleManager** - Core process monitoring and recovery
2. **EnhancedShellProcessManager** - Terminal process management with lifecycle integration  
3. **GlobalIntegrationSystem** - Central coordination and monitoring

## Quick Start

### 1. Basic Integration

```javascript
// Import the global integration system
import { globalIntegrationSystem } from './src/renderer/global-integration-system.js';

// The system will auto-initialize when DOM is ready
// You can also manually initialize:
await globalIntegrationSystem.initialize();
```

### 2. Using Enhanced Shell Manager

```javascript
import { createEnhancedShellManager } from './src/renderer/enhanced-shell-process-manager.js';

// Create an enhanced shell manager for a terminal tab
const shellManager = await createEnhancedShellManager('tab-1', terminalInstance, {
    lifecycle: {
        enableHealthChecks: true,
        enableResourceMonitoring: true,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    },
    autoRestart: true,
    maxRestarts: 3
});
```

### 3. Accessing System Status

```javascript
// Get system health summary
const health = globalIntegrationSystem.getHealthSummary();
console.log('System health:', health.overall);

// Get detailed process statuses
const status = window.RinaWarpIntegration.getSystemStatus();
console.log('All processes:', status.processes);
console.log('Shell statistics:', status.shells);
```

## Features

### 🔄 Automatic Process Recovery
- Monitors process health every 30 seconds
- Automatic restart with exponential backoff
- Graceful shutdown and cleanup
- Custom recovery strategies per process type

### 📊 Resource Monitoring
- Memory usage tracking
- CPU usage monitoring (where available)
- Performance metrics collection
- Resource optimization when thresholds exceeded

### 🎛️ Health Dashboard
- Real-time system status display
- Process health indicators
- Performance metrics visualization
- Alert notifications

### 🛠️ Debug Utilities
Access debug tools via `window.RinaWarpIntegration`:

```javascript
// System status
RinaWarpIntegration.getSystemStatus()

// Toggle health dashboard
RinaWarpIntegration.toggleDashboard()

// Get specific component
RinaWarpIntegration.getComponent('processLifecycleManager')

// Emit custom events
RinaWarpIntegration.emitEvent('custom:event', { data: 'test' })
```

## Configuration

### Global Configuration

```javascript
const config = {
    monitoring: {
        statusUpdateInterval: 5000,   // Status updates every 5 seconds
        performanceInterval: 10000,   // Performance check every 10 seconds
        healthCheckInterval: 30000,   // Health check every 30 seconds
    },
    ui: {
        showHealthIndicators: true,
        showPerformanceMetrics: true,
        enableNotifications: true
    },
    lifecycle: {
        autoRestart: true,
        maxRestarts: 5,
        enableResourceOptimization: true
    }
};

// Apply configuration
Object.assign(globalIntegrationSystem.config, config);
```

### Process-Specific Configuration

```javascript
const shellManager = await createEnhancedShellManager('tab-1', terminal, {
    // Shell configuration
    shell: '/bin/bash',
    cwd: process.env.HOME,
    
    // Lifecycle configuration
    lifecycle: {
        processId: 'shell-tab-1',
        enableHealthChecks: true,
        enableResourceMonitoring: true,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        autoRestart: true
    },
    
    // Recovery configuration
    restartOnExit: true,
    maxRestarts: 3,
    
    // Monitoring configuration
    enableDiagnostics: true,
    logLevel: 'info'
});
```

## Event System

### Lifecycle Events

```javascript
// Process health updates
window.addEventListener('process:health-update', (event) => {
    const { processId, status, metrics } = event.detail;
    console.log(`Process ${processId} health: ${status}`);
});

// Resource alerts
window.addEventListener('process:resource-alert', (event) => {
    const { processId, resourceType, value } = event.detail;
    console.warn(`High ${resourceType} usage: ${value} bytes`);
});

// Process restarts
window.addEventListener('process:restart', (event) => {
    const { processId, restartCount } = event.detail;
    console.log(`Process ${processId} restarted (attempt ${restartCount})`);
});
```

### Integration Events

```javascript
// System initialization
window.addEventListener('system:initialized', () => {
    console.log('Integration system ready');
});

// Terminal ready
window.addEventListener('terminal:ready', (event) => {
    console.log('Terminal ready:', event.detail);
});

// Feature loaded
window.addEventListener('feature:loaded', (event) => {
    console.log('Feature loaded:', event.detail.feature);
});
```

## Error Handling and Recovery

### Automatic Recovery Strategies

The system includes several built-in recovery strategies:

1. **Memory Optimization** - Clears caches, reduces scrollback, triggers GC
2. **Process Restart** - Graceful or forced restart with state preservation
3. **Resource Throttling** - Reduces monitoring frequency during high CPU usage

### Custom Recovery Strategies

```javascript
// Add custom recovery strategy
shellManager.recoveryStrategies.set('custom-recovery', async () => {
    // Custom recovery logic
    console.log('Running custom recovery...');
    
    // Return true if recovery successful
    return true;
});
```

### Error Monitoring

```javascript
// Monitor for errors
window.addEventListener('integration:global-error', (event) => {
    const { message, stack } = event.detail;
    
    // Send to error tracking service
    errorTracker.report({ message, stack });
    
    // Show user notification
    showErrorNotification(message);
});
```

## Performance Optimization

### Memory Management

```javascript
// Monitor memory usage
shellManager.on('memory-warning', ({ usage, limit }) => {
    console.warn(`Memory usage: ${usage}MB / ${limit}MB`);
    
    // Trigger optimization
    shellManager.optimizeMemoryUsage();
});
```

### Resource Monitoring

```javascript
// Get resource metrics
const metrics = shellManager.getEnhancedStatus();
console.log('Memory usage:', metrics.lifecycle.resourceUsage.memory);
console.log('CPU usage:', metrics.lifecycle.resourceUsage.cpu);
console.log('Avg response time:', metrics.lifecycle.avgResponseTime);
```

## Health Dashboard

The health dashboard provides real-time monitoring:

- **Process Lifecycle** - Shows health status of all managed processes
- **Performance Metrics** - System uptime, memory usage, shell statistics  
- **Recent Alerts** - Latest resource alerts and errors

### Dashboard Controls

```javascript
// Toggle dashboard visibility
RinaWarpIntegration.toggleDashboard();

// Access dashboard element
const dashboard = document.getElementById('rina-health-dashboard');

// Customize dashboard position
dashboard.style.top = '10px';
dashboard.style.left = '10px';
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce terminal scrollback: `terminal.options.scrollback = 500`
   - Clear diagnostic history: `shellManager.diagnostics.commands = []`
   - Trigger garbage collection: `window.electronAPI?.triggerGarbageCollection()`

2. **Process Not Responding**
   - Check process state: `shellManager.state`
   - Manual restart: `await shellManager.gracefulRestart()`
   - Check session ID: `shellManager.sessionId`

3. **Dashboard Not Showing**
   - Enable in config: `globalIntegrationSystem.config.ui.showHealthIndicators = true`
   - Check CSS styles are loaded
   - Verify DOM ready state

### Debug Commands

```javascript
// Check system status
console.log(RinaWarpIntegration.getSystemStatus());

// List all processes
console.log(window.processManager.getAllProcessStatuses());

// Get shell statistics
console.log(shellRegistry.getStats());

// Check integration health
console.log(globalIntegrationSystem.getHealthSummary());
```

## Migration from Basic Shell Manager

To migrate from the basic `ShellProcessManager` to `EnhancedShellProcessManager`:

1. **Replace imports:**
   ```javascript
   // OLD
   import { createShellManager } from './shell-process-manager.js';
   
   // NEW  
   import { createEnhancedShellManager } from './enhanced-shell-process-manager.js';
   ```

2. **Update creation:**
   ```javascript
   // OLD
   const manager = await createShellManager(tabId, terminal);
   
   // NEW
   const manager = await createEnhancedShellManager(tabId, terminal, {
       lifecycle: { enableHealthChecks: true }
   });
   ```

3. **Access enhanced features:**
   ```javascript
   // Get enhanced status
   const status = manager.getEnhancedStatus();
   
   // Access lifecycle metrics
   console.log(status.lifecycle.healthStatus);
   ```

## Best Practices

1. **Enable monitoring:** Always enable health checks and resource monitoring
2. **Set appropriate thresholds:** Configure memory and CPU limits based on your system
3. **Handle events:** Listen for lifecycle events and respond appropriately
4. **Use graceful restarts:** Prefer graceful over forced restarts when possible
5. **Monitor performance:** Regularly check system health summary
6. **Cleanup properly:** Always cleanup processes on shutdown

## API Reference

### ProcessLifecycleManager
- `registerProcess(id, processInfo)` - Register a process for monitoring
- `cleanupProcess(processId)` - Clean up a specific process
- `getAllProcessStatuses()` - Get status of all processes
- `cleanupAll()` - Clean up all processes

### EnhancedShellProcessManager
- `init()` - Initialize the shell process
- `gracefulRestart()` - Gracefully restart the process
- `optimizeResources(type)` - Optimize resource usage
- `getEnhancedStatus()` - Get detailed status information
- `cleanup()` - Clean up all resources

### GlobalIntegrationSystem
- `initialize()` - Initialize the integration system
- `getHealthSummary()` - Get overall system health
- `emitGlobalEvent(type, data)` - Emit a global event
- `cleanup()` - Clean up the integration system

This integration provides a robust, production-ready process lifecycle management system for your RinaWarp terminal with automatic recovery, resource monitoring, and comprehensive error handling.
