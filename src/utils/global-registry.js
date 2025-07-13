/**
 * RinaWarp Terminal - Global Registry Configuration
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Centralized registry for all global objects, their dependencies, and initialization order.
 * This file documents all global side effects and ensures proper dependency management.
 */

import { globalObjectManager } from './global-object-manager.js';

/**
 * Global Object Registry
 * Defines all global objects used in the application with their metadata
 */
export const GLOBAL_REGISTRY = {
  // Core Integration System
  rinaWarpIntegration: {
    dependencies: ['performanceMonitor', 'securityManager'],
    sideEffects: [
      'Adds window.RinaWarpIntegration',
      'Adds window.rinaWarpIntegration',
      'Modifies global event handling',
      'Sets up global error handlers',
    ],
    namespace: 'window',
    singleton: true,
    lazy: false,
    description: 'Main integration system that coordinates all features',
  },

  // Performance and Monitoring
  performanceMonitor: {
    dependencies: [],
    sideEffects: [
      'Adds window.PerformanceMonitor',
      'Sets up performance tracking intervals',
      'Modifies console for performance logging',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'System performance monitoring and optimization',
  },

  // Security Systems
  securityManager: {
    dependencies: [],
    sideEffects: [
      'Adds window.securityDashboard',
      'Modifies global security policies',
      'Sets up security event listeners',
    ],
    namespace: 'window',
    singleton: true,
    lazy: false,
    description: 'Zero-trust security management system',
  },

  enhancedSecurity: {
    dependencies: ['securityManager'],
    sideEffects: [
      'Adds window.EnhancedSecurity',
      'Modifies command execution flow',
      'Sets up audit logging',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Enhanced security features and threat detection',
  },

  // AI and Context Systems
  aiContextEngine: {
    dependencies: ['performanceMonitor'],
    sideEffects: [
      'Adds window.AIContextEngine',
      'Modifies terminal input/output handling',
      'Sets up AI prediction caching',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'AI-powered context analysis and suggestions',
  },

  agentManager: {
    dependencies: ['aiContextEngine', 'securityManager'],
    sideEffects: [
      'Adds window.agentManager',
      'Modifies AI agent lifecycle',
      'Sets up multimodal processing',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Multimodal AI agent management framework',
  },

  // UI and UX Systems
  beginnerUI: {
    dependencies: ['rinaWarpIntegration'],
    sideEffects: [
      'Adds window.beginnerUI',
      'Modifies DOM structure',
      'Adds CSS classes globally',
      'Sets up global UI event handlers',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Beginner-friendly UI overlay and tutorials',
  },

  nextGenUI: {
    dependencies: ['aiContextEngine', 'beginnerUI'],
    sideEffects: [
      'Adds window.NextGenUI',
      'Modifies global CSS variables',
      'Sets up adaptive UI behavior',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Next-generation adaptive user interface',
  },

  themeManager: {
    dependencies: [],
    sideEffects: [
      'Adds window.themeManager',
      'Modifies document.body classes',
      'Sets up CSS custom properties',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Theme and appearance management',
  },

  // Terminal and Workflow Systems
  terminalSharing: {
    dependencies: ['securityManager', 'performanceMonitor'],
    sideEffects: [
      'Adds window.TerminalSharing',
      'Sets up WebRTC connections',
      'Modifies terminal event handling',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Real-time terminal sharing and collaboration',
  },

  workflowAutomation: {
    dependencies: ['aiContextEngine', 'securityManager'],
    sideEffects: [
      'Adds window.WorkflowAutomation',
      'Modifies command execution pipeline',
      'Sets up automation triggers',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Intelligent workflow automation system',
  },

  // Voice and Accessibility
  voiceEngine: {
    dependencies: ['aiContextEngine'],
    sideEffects: [
      'Adds window.voiceEngine',
      'Requests microphone permissions',
      'Sets up speech recognition/synthesis',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Voice control and accessibility features',
  },

  // Data and Recovery
  dataRecoveryEngine: {
    dependencies: ['securityManager'],
    sideEffects: [
      'Adds window.dataRecoveryEngine',
      'Accesses file system',
      'Modifies storage cleanup procedures',
    ],
    namespace: 'window',
    singleton: true,
    lazy: true,
    description: 'Data recovery and file restoration system',
  },

  // Environment-specific globals
  nodeProcess: {
    dependencies: [],
    sideEffects: [
      'Accesses process.env',
      'Modifies process event handlers',
      'Sets up exit handlers',
    ],
    namespace: 'global',
    singleton: true,
    lazy: false,
    description: 'Node.js process management (server-side only)',
  },
};

/**
 * Initialize the global registry with proper dependency management
 */
export async function initializeGlobalRegistry() {
  // Register all global objects with the manager
  for (const [name, config] of Object.entries(GLOBAL_REGISTRY)) {
    const initializer = await getInitializer(name);
    if (initializer) {
      globalObjectManager.register(name, initializer, config);
    }
  }

  // Validate the registry for circular dependencies
  validateRegistry();
}

/**
 * Get the appropriate initializer function for a global object
 */
async function getInitializer(name) {
  switch (name) {
  case 'rinaWarpIntegration':
    return async () => {
      const { rinaWarpIntegration } = await import('../integration-layer/main-integration.js');
      return rinaWarpIntegration;
    };

  case 'performanceMonitor':
    return async () => {
      const { PerformanceMonitor } = await import('../renderer/performance-monitor.js');
      return new PerformanceMonitor();
    };

  case 'securityManager':
    return async () => {
      const { EnhancedSecurity } = await import('../renderer/enhanced-security.js');
      return new EnhancedSecurity();
    };

  case 'enhancedSecurity':
    return async () => {
      const { ZeroTrustSecurity } = await import('../renderer/zero-trust-security.js');
      return new ZeroTrustSecurity();
    };

  case 'aiContextEngine':
    return async () => {
      const { AIContextEngine } = await import('../renderer/ai-context-engine.js');
      return new AIContextEngine();
    };

  case 'agentManager':
    return async () => {
      const { MultimodalAgentManager } = await import('../renderer/multimodal-agent-manager.js');
      return new MultimodalAgentManager();
    };

  case 'beginnerUI':
    return async () => {
      const { BeginnerFriendlyUI } = await import('../renderer/beginner-friendly-ui.js');
      return new BeginnerFriendlyUI(window.terminalManager);
    };

  case 'nextGenUI':
    return async () => {
      const { NextGenUI } = await import('../renderer/next-gen-ui.js');
      return new NextGenUI();
    };

  case 'themeManager':
    return async () => {
      const { ThemeManager } = await import('../renderer/theme-manager.js');
      return new ThemeManager();
    };

  case 'terminalSharing':
    return async () => {
      const { TerminalSharing } = await import('../renderer/terminal-sharing.js');
      return new TerminalSharing();
    };

  case 'workflowAutomation':
    return async () => {
      const { WorkflowAutomation } = await import('../renderer/workflow-automation.js');
      return new WorkflowAutomation();
    };

  case 'voiceEngine':
    return async () => {
      const { VoiceEngine } = await import('../renderer/voice-engine.js');
      return new VoiceEngine();
    };

  case 'dataRecoveryEngine':
    return async () => {
      const { DataRecoveryEngine } = await import('../data-recovery/recovery-engine.js');
      return new DataRecoveryEngine();
    };

  case 'nodeProcess':
    return async () => {
      // Only available in Node.js environment
      if (typeof process !== 'undefined') {
        return process;
      }
      return null;
    };

  default:
    console.warn(`No initializer defined for global object: ${name}`);
    return null;
  }
}

/**
 * Validate the registry for potential issues
 */
function validateRegistry() {
  const issues = [];
  const names = Object.keys(GLOBAL_REGISTRY);

  // Check for circular dependencies
  for (const name of Object.keys(GLOBAL_REGISTRY)) {
    const visited = new Set();
    const visiting = new Set();

    function checkCircular(currentName) {
      if (visiting.has(currentName)) {
        issues.push({
          type: 'circular-dependency',
          object: currentName,
          details: `Circular dependency detected involving: ${currentName}`,
        });
        return;
      }
      if (visited.has(currentName)) {
        return;
      }

      visiting.add(currentName);
      const deps = GLOBAL_REGISTRY[currentName]?.dependencies || [];
      for (const dep of deps) {
        checkCircular(dep);
      }
      visiting.delete(currentName);
      visited.add(currentName);
    }

    checkCircular(name);
  }

  // Check for missing dependencies
  for (const [name, config] of Object.entries(GLOBAL_REGISTRY)) {
    for (const dep of config.dependencies) {
      if (!names.includes(dep)) {
        issues.push({
          type: 'missing-dependency',
          object: name,
          details: `Dependency '${dep}' is not registered in the global registry`,
        });
      }
    }
  }

  if (issues.length > 0) {
    console.warn('Global registry validation issues found:', issues);
  }

  return issues;
}

/**
 * Get dependency order for initialization
 */
export function getDependencyOrder() {
  const visited = new Set();
  const result = [];

  function visit(name) {
    if (visited.has(name)) {
      return;
    }

    const _config = GLOBAL_REGISTRY[name];
    if (!_config) {
      return;
    }

    // Visit dependencies first
    for (const dep of _config.dependencies) {
      visit(dep);
    }

    visited.add(name);
    result.push(name);
  }

  for (const name of Object.keys(GLOBAL_REGISTRY)) {
    visit(name);
  }

  return result;
}

/**
 * Generate documentation for global objects
 */
export function generateGlobalDocumentation() {
  const documentation = {
    overview: 'RinaWarp Terminal Global Objects Registry',
    totalObjects: Object.keys(GLOBAL_REGISTRY).length,
    categories: {},
    sideEffects: {},
    dependencyGraph: {},
  };

  // Categorize objects
  for (const [name, config] of Object.entries(GLOBAL_REGISTRY)) {
    const category = categorizeGlobal(name);
    if (!documentation.categories[category]) {
      documentation.categories[category] = [];
    }
    documentation.categories[category].push({
      name,
      description: config.description,
      dependencies: config.dependencies.length,
    });

    // Document side effects
    if (config.sideEffects.length > 0) {
      documentation.sideEffects[name] = config.sideEffects;
    }

    // Build dependency graph
    documentation.dependencyGraph[name] = config.dependencies;
  }

  return documentation;
}

/**
 * Categorize global objects by their purpose
 */
function categorizeGlobal(name) {
  if (name.includes('security') || name.includes('Security')) {
    return 'Security';
  }
  if (name.includes('ai') || name.includes('AI') || name.includes('agent')) {
    return 'AI & Intelligence';
  }
  if (name.includes('ui') || name.includes('UI') || name.includes('theme')) {
    return 'User Interface';
  }
  if (name.includes('terminal') || name.includes('workflow')) {
    return 'Terminal & Workflow';
  }
  if (name.includes('performance') || name.includes('monitor')) {
    return 'Performance & Monitoring';
  }
  if (name.includes('voice') || name.includes('Voice')) {
    return 'Voice & Accessibility';
  }
  if (name.includes('data') || name.includes('recovery')) {
    return 'Data & Recovery';
  }
  if (name.includes('integration') || name.includes('Integration')) {
    return 'Core Integration';
  }
  return 'System';
}

// Export for external use
export { globalObjectManager };
