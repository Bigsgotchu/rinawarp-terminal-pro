/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * ShellProcessManager Integration Example
 * 
 * This shows how to integrate the ShellProcessManager with your existing
 * terminal setup and boot tracer system.
 */

import { ShellProcessManager, createShellManager, shellRegistry } from '../src/renderer/shell-process-manager.js';

/**
 * Enhanced terminal creation with shell process management
 */
export async function createTerminalWithShell(tabId, container, options = {}) {
    try {
        // Load XTerm modules (using your existing smart loader)
        let modules = window.diagnosticState?.xtermModules;
        if (!modules) {
            modules = await window.moduleLoader.loadXTermModules();
            window.diagnosticState.xtermModules = modules;
        }

        const { Terminal, FitAddon, WebLinksAddon } = modules;

        // Create terminal with enhanced configuration
        const terminal = new Terminal({
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#00ff88',
                cursorAccent: '#000000',
                selection: '#ffffff33',
                black: '#000000',
                red: '#ff6b6b',
                green: '#51cf66',
                yellow: '#ffd93d',
                blue: '#74c0fc',
                magenta: '#e599f7',
                cyan: '#66d9ef',
                white: '#ffffff'
            },
            cols: 80,
            rows: 30,
            ...options.terminalConfig
        });

        // Load addons
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        // Clear container and open terminal
        container.innerHTML = '';
        terminal.open(container);

        // Fit to container
        setTimeout(() => {
            fitAddon.fit();
        }, 100);

        // Create shell process manager
        const shellOptions = {
            shell: options.shell || '/bin/bash',
            cwd: options.cwd,
            enableDiagnostics: options.enableDiagnostics !== false,
            logLevel: options.logLevel || 'info',
            ...options.shellConfig
        };

        const shellManager = await createShellManager(tabId, terminal, shellOptions);
        
        // Register with global registry
        shellRegistry.register(tabId, shellManager);

        // Set up shell manager event handlers
        setupShellManagerHandlers(shellManager, terminal, tabId);

        // Add terminal methods for easier interaction
        terminal.shellManager = shellManager;
        terminal.writeCommand = (command) => shellManager.writeToShell(command + '\r');
        terminal.restart = () => shellManager.restart();
        terminal.getStatus = () => shellManager.getStatus();

        return {
            terminal,
            shellManager,
            fitAddon,
            webLinksAddon
        };

    } catch (error) {
        console.error(`Failed to create terminal with shell for tab ${tabId}:`, error);
        throw new Error(error);
    }
}

/**
 * Set up event handlers for shell manager
 */
function setupShellManagerHandlers(shellManager, terminal, tabId) {
    // Handle shell restart events
    shellManager.on('restart', (data) => {
        console.log(`Shell restarted for tab ${tabId}:`, data);
        
        // Update UI indicators
        updateTabIndicator(tabId, 'restarted', '🔄');
        
        // Notify other systems
        if (window.diagnosticState?.bootTracer) {
            window.diagnosticState.bootTracer.log(`Shell restarted for tab ${tabId}`, 'info');
        }
    });

    // Handle shell errors
    shellManager.on('error', (data) => {
        console.error(`Shell error for tab ${tabId}:`, data);
        
        // Update UI indicators
        updateTabIndicator(tabId, 'error', '🔴');
        
        // Show error notification if this is the active tab
        if (shellManager.isCurrentTab()) {
            showErrorNotification(`Shell Error: ${data.message}`);
        }
    });

    // Handle shell exit
    shellManager.on('exit', (data) => {
        console.log(`Shell exited for tab ${tabId}:`, data);
        
        // Update UI indicators
        updateTabIndicator(tabId, 'exited', '💀');
    });

    // Handle data events (for monitoring/analytics)
    shellManager.on('data', (data) => {
        // Track data flow for diagnostics
        if (window.diagnosticState) {
            if (!window.diagnosticState.dataStats) {
                window.diagnosticState.dataStats = { sent: 0, received: 0 };
            }
            
            if (data.direction === 'sent') {
                window.diagnosticState.dataStats.sent += data.size;
            } else {
                window.diagnosticState.dataStats.received += data.size;
            }
        }
    });
}

/**
 * Update tab indicator with shell status
 */
function updateTabIndicator(tabId, status, emoji) {
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        // Update shell state indicator
        let indicator = tabElement.querySelector('.shell-state');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'shell-state';
            tabElement.appendChild(indicator);
        }
        
        indicator.className = `shell-state state-${status}`;
        indicator.textContent = emoji;
        indicator.title = `Shell status: ${status}`;
    }
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
    // Create or update error notification
    let notification = document.getElementById('shell-error-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'shell-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

/**
 * Enhanced tab manager that integrates shell processes
 */
export class EnhancedTabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
    }

    async createTab(tabId, options = {}) {
        try {
            const container = document.getElementById(`terminal-tab-${tabId}`);
            if (!container) {
                throw new Error(new Error(`Container not found: terminal-tab-${tabId}`));
            }

            // Create terminal with shell
            const terminalSetup = await createTerminalWithShell(tabId, container, options);
            
            // Store tab data
            this.tabs.set(tabId, {
                ...terminalSetup,
                created: Date.now(),
                lastActive: Date.now()
            });

            console.log(`Tab ${tabId} created with shell integration`);
            return terminalSetup;

        } catch (error) {
            console.error(`Failed to create tab ${tabId}:`, error);
            throw new Error(error);
        }
    }

    switchTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.warn(`Tab ${tabId} not found`);
            return false;
        }

        this.activeTabId = tabId;
        tab.lastActive = Date.now();
        
        // Focus terminal
        tab.terminal.focus();
        
        // Fit terminal to container
        setTimeout(() => {
            tab.fitAddon.fit();
        }, 100);

        console.log(`Switched to tab ${tabId}`);
        return true;
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.warn(`Tab ${tabId} not found`);
            return false;
        }

        // Cleanup shell manager
        shellRegistry.unregister(tabId);
        
        // Cleanup terminal
        tab.terminal.dispose();
        
        // Remove from tabs
        this.tabs.delete(tabId);

        console.log(`Tab ${tabId} closed and cleaned up`);
        return true;
    }

    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    getStats() {
        const shellStats = shellRegistry.getStats();
        const tabStats = {
            total: this.tabs.size,
            active: this.activeTabId ? 1 : 0,
            oldestTab: null,
            newestTab: null
        };

        if (this.tabs.size > 0) {
            const tabTimes = Array.from(this.tabs.values()).map(t => t.created);
            tabStats.oldestTab = Math.min(...tabTimes);
            tabStats.newestTab = Math.max(...tabTimes);
        }

        return {
            tabs: tabStats,
            shells: shellStats
        };
    }
}

/**
 * Global enhanced tab manager instance
 */
export const enhancedTabManager = new EnhancedTabManager();

/**
 * Integration with existing boot tracer system
 */
export async function integrateWithBootTracer() {
    if (!window.diagnosticState?.bootTracer) {
        console.warn('Boot tracer not available for shell manager integration');
        return;
    }

    const bootTracer = window.diagnosticState.bootTracer;
    
    // Enhance boot tracer with shell management
    bootTracer.createShellTab = async (tabId, options = {}) => {
        bootTracer.log(`Creating shell tab: ${tabId}`, 'info');
        
        try {
            const terminalSetup = await enhancedTabManager.createTab(tabId, options);
            bootTracer.log(`Shell tab created successfully: ${tabId}`, 'success');
            return terminalSetup;
        } catch (error) {
            bootTracer.log(`Shell tab creation failed: ${error.message}`, 'error');
            throw new Error(error);
        }
    };

    // Add shell stats to boot report
    const originalGetBootReport = bootTracer.getBootReport.bind(bootTracer);
    bootTracer.getBootReport = () => {
        const report = originalGetBootReport();
        report.shellManagement = {
            stats: enhancedTabManager.getStats(),
            timestamp: Date.now()
        };
        return report;
    };

    console.log('Shell manager integrated with boot tracer');
}

/**
 * Command line interface for shell management
 */
export function setupShellManagerCLI() {
    if (typeof window !== 'undefined') {
        // Add global shell management functions
        window.shellManager = {
            // Get shell stats
            stats: () => {
                console.table(shellRegistry.getStats());
                return shellRegistry.getStats();
            },
            
            // List all shells
            list: () => {
                const shells = shellRegistry.getAll().map(m => ({
                    tabId: m.tabId,
                    state: m.state,
                    uptime: Math.round((Date.now() - m.startTime) / 1000) + 's',
                    commands: m.diagnostics.performance.totalCommands,
                    errors: m.errorCount
                }));
                console.table(shells);
                return shells;
            },
            
            // Restart shell by tab ID
            restart: async (tabId) => {
                const manager = shellRegistry.get(tabId);
                if (manager) {
                    await manager.restart();
                    console.log(`Shell restarted for tab ${tabId}`);
                } else {
                    console.warn(`No shell found for tab ${tabId}`);
                }
            },
            
            // Get detailed status
            status: (tabId) => {
                const manager = shellRegistry.get(tabId);
                if (manager) {
                    const status = manager.getStatus();
                    console.log(`Shell status for tab ${tabId}:`, status);
                    return status;
                } else {
                    console.warn(`No shell found for tab ${tabId}`);
                    return null;
                }
            },
            
            // Send command to specific shell
            send: async (tabId, command) => {
                const manager = shellRegistry.get(tabId);
                if (manager) {
                    await manager.writeToShell(command + '\r');
                    console.log(`Command sent to tab ${tabId}: ${command}`);
                } else {
                    console.warn(`No shell found for tab ${tabId}`);
                }
            }
        };

        console.log('Shell manager CLI available at window.shellManager');
    }
}

// Auto-setup when module loads
if (typeof window !== 'undefined') {
    setupShellManagerCLI();
    
    // Auto-integrate with boot tracer when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            integrateWithBootTracer();
        }, 1000);
    });
}
