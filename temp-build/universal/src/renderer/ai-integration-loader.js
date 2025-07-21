/**
 * AI Integration Loader for RinaWarp Terminal
 * Dynamically loads and integrates all AI components into existing terminal
 */

(function() {
  'use strict';

  console.log('🚀 Loading RinaWarp Terminal AI Enhancements...');

  // Check if we're in the right environment
  if (typeof window === 'undefined') {
    console.error('AI Integration Loader must run in browser environment');
    return;
  }

  // Configuration
  const AI_COMPONENTS = [
    'enhanced-command-intelligence.js',
    'git-integration-advanced.js', 
    'project-analyzer-advanced.js',
    'debugger-integration-advanced.js',
    'ai-orchestrator.js'
  ];

  const BASE_PATH = './renderer/';

  // Component loader utility
  class AIComponentLoader {
    constructor() {
      this.loadedComponents = new Set();
      this.loadingPromises = new Map();
      this.dependencies = new Map();
      
      this.setupDependencies();
    }

    setupDependencies() {
      // Define component dependencies
      this.dependencies.set('ai-orchestrator.js', [
        'enhanced-command-intelligence.js',
        'git-integration-advanced.js',
        'project-analyzer-advanced.js',
        'debugger-integration-advanced.js'
      ]);
    }

    async loadComponent(componentPath) {
      if (this.loadedComponents.has(componentPath)) {
        return Promise.resolve();
      }

      if (this.loadingPromises.has(componentPath)) {
        return this.loadingPromises.get(componentPath);
      }

      console.log(`📦 Loading component: ${componentPath}`);

      const loadPromise = new Promise(async (resolve, reject) => {
        try {
          // Load dependencies first
          const deps = this.dependencies.get(componentPath) || [];
          for (const dep of deps) {
            await this.loadComponent(dep);
          }

          // Load the component
          await this.loadScript(`${BASE_PATH}${componentPath}`);
          
          this.loadedComponents.add(componentPath);
          console.log(`✅ Loaded: ${componentPath}`);
          resolve();
          
        } catch (error) {
          console.error(`❌ Failed to load ${componentPath}:`, error);
          reject(error);
        }
      });

      this.loadingPromises.set(componentPath, loadPromise);
      return loadPromise;
    }

    async loadScript(src) {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        script.async = false; // Ensure order
        
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
        
        document.head.appendChild(script);
      });
    }

    async loadAllComponents() {
      try {
        console.log('📚 Loading all AI components...');
        
        // Load all components
        await Promise.all(
          AI_COMPONENTS.map(component => this.loadComponent(component))
        );
        
        console.log('✅ All AI components loaded successfully!');
        return true;
        
      } catch (error) {
        console.error('❌ Failed to load AI components:', error);
        return false;
      }
    }
  }

  // Terminal Integration Helper
  class TerminalIntegrator {
    constructor() {
      this.terminal = null;
      this.aiSystem = null;
      this.integrated = false;
    }

    async integrate() {
      if (this.integrated) return;

      console.log('🔧 Integrating AI system with terminal...');

      // Find the terminal instance
      this.findTerminal();

      // Wait for AI system to be available
      await this.waitForAISystem();

      // Set up integration hooks
      this.setupIntegrationHooks();

      // Set up terminal event listeners
      this.setupTerminalEvents();

      // Add AI UI elements
      this.addAIUIElements();

      this.integrated = true;
      console.log('✅ AI system integrated with terminal');
    }

    findTerminal() {
      // Try to find XTerm.js terminal instance
      if (window.terminal) {
        this.terminal = window.terminal;
        console.log('📺 Found terminal instance');
        return;
      }

      // Try to find terminal in common locations
      const terminalElement = document.getElementById('terminal') || 
                            document.querySelector('.xterm') ||
                            document.querySelector('.terminal');
      
      if (terminalElement) {
        console.log('📺 Found terminal element');
        // Terminal element found but no instance - we'll create integration hooks anyway
      }
    }

    async waitForAISystem() {
      return new Promise((resolve) => {
        const checkForAI = () => {
          if (window.rinaWarpAI && window.rinaWarpAI.getSystemStatus().initialized) {
            this.aiSystem = window.rinaWarpAI;
            console.log('🧠 AI system ready');
            resolve();
          } else {
            setTimeout(checkForAI, 100);
          }
        };
        checkForAI();
      });
    }

    setupIntegrationHooks() {
      if (!this.aiSystem) return;

      // Hook into terminal command execution
      this.hookCommandExecution();

      // Hook into directory changes
      this.hookDirectoryChanges();

      // Hook into error handling
      this.hookErrorHandling();
    }

    hookCommandExecution() {
      // Create a wrapper for command execution
      const originalExecuteCommand = window.electronAPI?.executeCommand;
      
      if (originalExecuteCommand) {
        window.electronAPI.executeCommand = async (command, options) => {
          try {
            // Notify AI system of command execution
            if (this.aiSystem.context) {
              this.aiSystem.context.updateCommand(command);
            }

            // Execute the command
            const result = await originalExecuteCommand.call(window.electronAPI, command, options);
            
            // Let AI system learn from the result
            if (this.aiSystem.eventBus) {
              this.aiSystem.eventBus.emit('commandExecuted', {
                command,
                result,
                options
              });
            }

            return result;
          } catch (error) {
            // Handle errors through AI system
            if (this.aiSystem.eventBus) {
              this.aiSystem.eventBus.emit('error', {
                error,
                context: { command, source: 'terminal' }
              });
            }
            throw error;
          }
        };
      }
    }

    hookDirectoryChanges() {
      // Monitor for directory changes
      let lastDirectory = '';
      
      const checkDirectory = async () => {
        try {
          if (window.electronAPI?.getCurrentDirectory) {
            const currentDir = await window.electronAPI.getCurrentDirectory();
            if (currentDir && currentDir !== lastDirectory) {
              lastDirectory = currentDir;
              
              // Notify AI system
              if (this.aiSystem.eventBus) {
                this.aiSystem.eventBus.emit('directoryChanged', {
                  newDir: currentDir,
                  oldDir: lastDirectory
                });
              }
            }
          }
        } catch (error) {
          // Silently handle directory check errors
        }
        
        setTimeout(checkDirectory, 2000);
      };

      checkDirectory();
    }

    hookErrorHandling() {
      // Global error handler
      const originalErrorHandler = window.onerror;
      
      window.onerror = (message, source, lineno, colno, error) => {
        // Send to AI system for analysis
        if (this.aiSystem.eventBus && error) {
          this.aiSystem.eventBus.emit('error', {
            error,
            context: { source: 'global', lineno, colno }
          });
        }

        // Call original handler if it exists
        if (originalErrorHandler) {
          return originalErrorHandler.call(window, message, source, lineno, colno, error);
        }
      };
    }

    setupTerminalEvents() {
      if (!this.terminal) return;

      // Listen for terminal data
      if (this.terminal.onData) {
        this.terminal.onData((data) => {
          // Send keystroke data to AI for real-time analysis
          if (this.aiSystem.eventBus) {
            this.aiSystem.eventBus.emit('terminalInput', { data });
          }
        });
      }

      // Listen for terminal selection changes
      if (this.terminal.onSelectionChange) {
        this.terminal.onSelectionChange(() => {
          const selection = this.terminal.getSelection();
          if (selection && this.aiSystem.eventBus) {
            this.aiSystem.eventBus.emit('terminalSelection', { selection });
          }
        });
      }
    }

    addAIUIElements() {
      // Add AI status indicator
      this.addStatusIndicator();

      // Add quick access buttons
      this.addQuickAccessButtons();

      // Add keyboard shortcuts info
      this.addKeyboardShortcuts();
    }

    addStatusIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'rina-ai-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 170, 255, 0.9);
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10001;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      
      const updateStatus = () => {
        if (this.aiSystem) {
          const status = this.aiSystem.getSystemStatus();
          const features = status.features.length;
          indicator.innerHTML = `🧠 AI: ${features} features active`;
          indicator.title = `Components: ${status.components.join(', ')}`;
        }
      };

      updateStatus();
      setInterval(updateStatus, 5000);

      indicator.onclick = () => {
        if (this.aiSystem) {
          console.log('RinaWarp AI Status:', this.aiSystem.getSystemStatus());
        }
      };

      document.body.appendChild(indicator);
    }

    addQuickAccessButtons() {
      const container = document.createElement('div');
      container.id = 'rina-quick-access';
      container.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9998;
      `;

      const buttons = [
        {
          text: '🔍',
          title: 'Analyze Project',
          action: async () => {
            if (this.aiSystem) {
              const analysis = await this.aiSystem.analyzeProject('.');
              console.log('Project Analysis:', analysis);
            }
          }
        },
        {
          text: '💡',
          title: 'Get Suggestions',
          action: () => {
            if (this.aiSystem) {
              const suggestions = this.aiSystem.getCurrentSuggestions();
              console.log('Current Suggestions:', suggestions);
            }
          }
        },
        {
          text: '🐛',
          title: 'Start Debug Session',
          action: async () => {
            if (this.aiSystem) {
              try {
                const sessionId = await this.aiSystem.startDebugSession('node');
                console.log('Debug session started:', sessionId);
              } catch (error) {
                console.error('Debug session failed:', error.message);
              }
            }
          }
        }
      ];

      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.innerHTML = btn.text;
        button.title = btn.title;
        button.style.cssText = `
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 50%;
          background: rgba(0, 170, 255, 0.9);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        `;
        
        button.onmouseover = () => {
          button.style.background = 'rgba(255, 20, 147, 0.9)';
          button.style.transform = 'scale(1.1)';
        };
        
        button.onmouseout = () => {
          button.style.background = 'rgba(0, 170, 255, 0.9)';
          button.style.transform = 'scale(1)';
        };
        
        button.onclick = btn.action;
        container.appendChild(button);
      });

      document.body.appendChild(container);
    }

    addKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+R: Reload AI system
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          location.reload();
        }
        
        // Ctrl+Shift+A: Show AI status
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          if (this.aiSystem) {
            console.log('RinaWarp AI Status:', this.aiSystem.getSystemStatus());
          }
        }
        
        // Ctrl+Shift+S: Show suggestions
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
          e.preventDefault();
          if (this.aiSystem) {
            const suggestions = this.aiSystem.getCurrentSuggestions();
            console.log('AI Suggestions:', suggestions);
          }
        }
      });
    }
  }

  // Main initialization function
  async function initializeAIEnhancements() {
    try {
      console.log('🎯 Starting RinaWarp AI Enhancement initialization...');

      // Load all AI components
      const loader = new AIComponentLoader();
      const success = await loader.loadAllComponents();
      
      if (!success) {
        console.error('❌ Failed to load AI components');
        return;
      }

      // Wait a moment for components to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Integrate with terminal
      const integrator = new TerminalIntegrator();
      await integrator.integrate();

      console.log('🎉 RinaWarp Terminal AI Enhancements fully loaded and integrated!');
      
      // Show welcome notification
      if (window.rinaWarpAI) {
        setTimeout(() => {
          console.log('🌊 Welcome to Enhanced RinaWarp Terminal!');
          console.log('Available features:', window.rinaWarpAI.getAvailableFeatures());
          console.log('Keyboard shortcuts: Ctrl+Shift+A (status), Ctrl+Shift+S (suggestions)');
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Failed to initialize AI enhancements:', error);
    }
  }

  // Auto-start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAIEnhancements);
  } else {
    initializeAIEnhancements();
  }

  // Expose loader for manual control
  window.rinaWarpAILoader = {
    initialize: initializeAIEnhancements,
    reload: () => location.reload()
  };

})();
