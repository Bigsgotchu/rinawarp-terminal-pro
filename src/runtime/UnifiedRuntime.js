/**
 * 🌟 RinaWarp Unified Runtime Architecture v2.0
 * Feature-Orchestrated Boot System with Adaptive Module Loading
 * 
 * Core Philosophy:
 * - Minimal core, maximum adaptability
 * - Environment-aware module selection
 * - Real-time diagnostics and status reporting
 * - Graceful degradation for low-spec environments
 */

import { ModuleOrchestrator } from '../renderer/module-orchestrator.js';

/**
 * 🎯 Module Registry - Centralized Feature Management
 */
export class ModuleRegistry {
    constructor(orchestrator) {
        this.modules = new Map();
        this.orchestrator = orchestrator;
        this.loadingStates = new Map();
        this.dependencies = new Map();
        this.eventEmitter = new EventTarget();
        
        this.setupDiagnostics();
    }

    setupDiagnostics() {
        this.diagnostics = {
            totalModules: 0,
            loadedModules: 0,
            failedModules: [],
            loadTime: 0,
            startTime: Date.now()
        };
    }

    /**
     * Register a module with conditional loading
     */
    async register(name, loaderFn, condition = () => true, dependencies = []) {
        if (!condition()) {
            console.log(`⏭️ Skipping ${name} - condition not met`);
            return false;
        }

        // Check dependencies
        for (const dep of dependencies) {
            if (!this.modules.has(dep)) {
                console.warn(`⚠️ ${name} dependency ${dep} not available`);
                return false;
            }
        }

        this.diagnostics.totalModules++;
        this.loadingStates.set(name, 'loading');
        this.dependencies.set(name, dependencies);

        try {
            console.log(`🔄 Loading ${name}...`);
            const startTime = performance.now();
            
            const rawModule = await loaderFn();
            const normalizedModule = this.orchestrator.normalizeExports ? 
                this.orchestrator.normalizeExports(rawModule, Object.keys(rawModule)) : 
                rawModule;
            
            if (!normalizedModule) {
                throw new Error(`Failed to normalize exports for ${name}`);
            }

            this.modules.set(name, {
                module: normalizedModule,
                loadTime: performance.now() - startTime,
                dependencies,
                timestamp: Date.now()
            });

            this.loadingStates.set(name, 'loaded');
            this.diagnostics.loadedModules++;

            // Emit module loaded event
            this.eventEmitter.dispatchEvent(new CustomEvent('moduleLoaded', {
                detail: { name, loadTime: this.modules.get(name).loadTime }
            }));

            console.log(`✅ ${name} loaded successfully (${this.modules.get(name).loadTime.toFixed(2)}ms)`);
            return true;

        } catch (error) {
            this.loadingStates.set(name, 'failed');
            this.diagnostics.failedModules.push({ name, error: error.message });
            
            console.error(`❌ ${name} failed to load:`, error.message);
            
            // Emit module failed event
            this.eventEmitter.dispatchEvent(new CustomEvent('moduleFailed', {
                detail: { name, error: error.message }
            }));
            
            return false;
        }
    }

    /**
     * Get a loaded module
     */
    get(name) {
        const entry = this.modules.get(name);
        return entry ? entry.module : null;
    }

    /**
     * Get module loading state
     */
    getState(name) {
        return this.loadingStates.get(name) || 'unregistered';
    }

    /**
     * Get comprehensive diagnostics
     */
    getDiagnostics() {
        return {
            ...this.diagnostics,
            loadTime: Date.now() - this.diagnostics.startTime,
            loadedModulesList: Array.from(this.modules.keys()),
            moduleStates: Object.fromEntries(this.loadingStates),
            successRate: this.diagnostics.totalModules > 0 ? 
                (this.diagnostics.loadedModules / this.diagnostics.totalModules) * 100 : 0
        };
    }

    /**
     * Subscribe to module events
     */
    on(event, callback) {
        this.eventEmitter.addEventListener(event, callback);
    }
}

/**
 * 🎮 Environment Detection & Configuration
 */
export class EnvironmentDetector {
    static detect() {
        const env = {
            platform: 'unknown',
            mode: 'development',
            capabilities: {
                shell: false,
                voice: false,
                notifications: false,
                clipboard: false,
                mediaDevices: false
            },
            performance: {
                memory: navigator.deviceMemory || 4,
                cores: navigator.hardwareConcurrency || 2,
                connection: navigator.connection?.effectiveType || 'unknown'
            }
        };

        // Platform detection
        if (window.electronAPI) {
            env.platform = 'electron';
            env.capabilities.shell = true;
        } else if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            env.platform = 'mobile';
        } else {
            env.platform = 'browser';
        }

        // Mode detection
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:') {
            env.mode = 'development';
        } else {
            env.mode = 'production';
        }

        // Capability detection
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
            env.capabilities.mediaDevices = true;
            env.capabilities.voice = true;
        }

        if ('clipboard' in navigator) {
            env.capabilities.clipboard = true;
        }

        if ('Notification' in window) {
            env.capabilities.notifications = true;
        }

        return env;
    }

    static getOptimalConfig(environment) {
        const config = {
            modules: {
                core: ['Terminal', 'FitAddon'],
                enhanced: [],
                optional: []
            },
            performance: {
                lazyLoad: false,
                preload: true,
                cacheModules: true
            },
            ui: {
                theme: 'default',
                animations: true,
                diagnostics: true
            }
        };

        // Platform-specific optimizations
        switch (environment.platform) {
            case 'electron':
                config.modules.enhanced.push('ShellManager', 'VoiceEngine', 'ErrorDetection');
                config.modules.optional.push('MoodDetector', 'AnalyticsEngine');
                break;

            case 'mobile':
                config.modules.enhanced.push('MobileCompanion');
                config.performance.lazyLoad = true;
                config.ui.animations = false;
                break;

            case 'browser':
                config.modules.optional.push('VoiceEngine');
                config.performance.lazyLoad = true;
                break;
        }

        // Performance-based adjustments
        if (environment.performance.memory < 4) {
            config.performance.lazyLoad = true;
            config.ui.animations = false;
            config.modules.optional = [];
        }

        return config;
    }
}

/**
 * 🌟 Unified Runtime - The Heart of RinaWarp
 */
export class UnifiedRuntime {
    constructor(userConfig = {}) {
        this.environment = EnvironmentDetector.detect();
        this.config = this.mergeConfig(userConfig);
        
        this.orchestrator = null;
        this.registry = null;
        this.terminal = null;
        
        this.status = {
            phase: 'initializing',
            progress: 0,
            message: 'Preparing runtime...'
        };

        this.eventEmitter = new EventTarget();
        this.startTime = Date.now();

        console.log('🚀 RinaWarp Unified Runtime initializing...', {
            environment: this.environment,
            config: this.config
        });
    }

    mergeConfig(userConfig) {
        const envConfig = EnvironmentDetector.getOptimalConfig(this.environment);
        return {
            ...envConfig,
            ...userConfig,
            modules: {
                ...envConfig.modules,
                ...userConfig.modules
            }
        };
    }

    /**
     * 🎯 Boot Sequence - Orchestrated Initialization
     */
    async boot() {
        try {
            this.updateStatus('core', 10, 'Initializing core systems...');
            await this.initializeCore();

            this.updateStatus('modules', 30, 'Loading feature modules...');
            await this.loadModules();

            this.updateStatus('terminal', 60, 'Creating terminal interface...');
            await this.createTerminal();

            this.updateStatus('features', 80, 'Activating enhanced features...');
            await this.activateFeatures();

            this.updateStatus('complete', 100, 'Runtime ready!');
            
            const bootTime = Date.now() - this.startTime;
            console.log(`✅ RinaWarp boot complete in ${bootTime}ms`);
            
            this.eventEmitter.dispatchEvent(new CustomEvent('bootComplete', {
                detail: { bootTime, diagnostics: this.getDiagnostics() }
            }));

            return true;

        } catch (error) {
            this.updateStatus('error', -1, `Boot failed: ${error.message}`);
            console.error('❌ Runtime boot failed:', error);
            
            this.eventEmitter.dispatchEvent(new CustomEvent('bootError', {
                detail: { error: error.message }
            }));
            
            throw error;
        }
    }

    async initializeCore() {
        // Initialize ModuleOrchestrator with environment-specific config
        this.orchestrator = new ModuleOrchestrator({
            debugMode: this.environment.mode === 'development',
            platform: this.environment.platform,
            ...this.config.orchestrator
        });

        // Create module registry
        this.registry = new ModuleRegistry(this.orchestrator);

        // Set up event forwarding
        this.registry.on('moduleLoaded', (event) => {
            this.eventEmitter.dispatchEvent(new CustomEvent('moduleLoaded', event));
        });

        this.registry.on('moduleFailed', (event) => {
            this.eventEmitter.dispatchEvent(new CustomEvent('moduleFailed', event));
        });
    }

    async loadModules() {
        const { core, enhanced, optional } = this.config.modules;

        // Load core modules (required)
        for (const moduleName of core) {
            await this.loadCoreModule(moduleName);
        }

        // Load enhanced modules (best effort)
        for (const moduleName of enhanced) {
            await this.loadEnhancedModule(moduleName);
        }

        // Load optional modules (conditional)
        if (!this.config.performance.lazyLoad) {
            for (const moduleName of optional) {
                await this.loadOptionalModule(moduleName);
            }
        }
    }

    async loadCoreModule(name) {
        const loaders = {
            'Terminal': () => this.orchestrator.loadXTermModules().then(m => ({ Terminal: m.Terminal })),
            'FitAddon': () => this.orchestrator.loadXTermModules().then(m => ({ FitAddon: m.FitAddon })),
        };

        if (!loaders[name]) {
            throw new Error(`Unknown core module: ${name}`);
        }

        const success = await this.registry.register(name, loaders[name]);
        if (!success) {
            throw new Error(`Failed to load required core module: ${name}`);
        }
    }

    async loadEnhancedModule(name) {
        const conditions = {
            'ShellManager': () => this.environment.platform === 'electron',
            'VoiceEngine': () => this.environment.capabilities.voice,
            'ErrorDetection': () => this.environment.platform === 'electron',
            'MobileCompanion': () => this.environment.platform === 'mobile'
        };

        const loaders = {
            'ShellManager': () => import('../renderer/shell-process-manager.js'),
            'VoiceEngine': () => import('../renderer/voice-command-system.js'),
            'ErrorDetection': () => import('../renderer/predictive-error-detection.js'),
            'MobileCompanion': () => import('../mobile/companion.js')
        };

        const condition = conditions[name] || (() => true);
        const loader = loaders[name];

        if (loader) {
            await this.registry.register(name, loader, condition);
        }
    }

    async loadOptionalModule(name) {
        const loaders = {
            'MoodDetector': () => import('../renderer/mood-detection-engine-fixed.js'),
            'AnalyticsEngine': () => import('../analytics/engine.js')
        };

        const loader = loaders[name];
        if (loader) {
            await this.registry.register(name, loader, () => true);
        }
    }

    async createTerminal() {
        const Terminal = this.registry.get('Terminal');
        const FitAddon = this.registry.get('FitAddon');

        if (!Terminal?.Terminal) {
            throw new Error('Terminal module not available');
        }

        // Create terminal with environment-optimized config
        const terminalConfig = {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: this.environment.platform === 'mobile' ? 12 : 14,
            theme: this.getTheme(),
            cursorBlink: this.config.ui.animations,
            ...this.config.terminal
        };

        this.terminal = new Terminal.Terminal(terminalConfig);

        // Add fit addon if available
        if (FitAddon?.FitAddon) {
            const fitAddon = new FitAddon.FitAddon();
            this.terminal.loadAddon(fitAddon);
            this.terminal.fitAddon = fitAddon;
        }

        // Open terminal
        const container = document.getElementById('terminal-tab-main');
        if (container) {
            this.terminal.open(container);
            if (this.terminal.fitAddon) {
                setTimeout(() => this.terminal.fitAddon.fit(), 100);
            }
        }
    }

    async activateFeatures() {
        // Activate shell manager if available
        const shellManager = this.registry.get('ShellManager');
        if (shellManager && this.environment.capabilities.shell) {
            await this.activateShellManager(shellManager);
        }

        // Activate voice engine if available
        const voiceEngine = this.registry.get('VoiceEngine');
        if (voiceEngine && this.environment.capabilities.voice) {
            this.activateVoiceEngine(voiceEngine);
        }

        // Set up terminal welcome message
        this.displayWelcome();
    }

    async activateShellManager(shellManager) {
        try {
            const manager = await shellManager.createShellManager('main', this.terminal, {
                shell: '/bin/bash',
                enableDiagnostics: true
            });

            this.terminal.shellManager = manager;
            console.log('✅ Shell manager activated');
        } catch (error) {
            console.warn('⚠️ Shell manager activation failed:', error.message);
        }
    }

    activateVoiceEngine(voiceEngine) {
        try {
            const engine = voiceEngine.initializeGlobalVoiceCommands({
                enableFeedback: true,
                confidence: 0.7
            });

            if (this.terminal) {
                engine.setIntegration(this.terminal, this.terminal.shellManager);
            }

            console.log('✅ Voice engine activated');
        } catch (error) {
            console.warn('⚠️ Voice engine activation failed:', error.message);
        }
    }

    displayWelcome() {
        if (!this.terminal) return;

        const bootTime = Date.now() - this.startTime;
        const diagnostics = this.getDiagnostics();

        this.terminal.writeln(`\r\n🌟 Welcome to RinaWarp Terminal v2.0`);
        this.terminal.writeln(`🚀 Runtime: ${this.environment.platform} | Boot: ${bootTime}ms`);
        this.terminal.writeln(`📦 Modules: ${diagnostics.loadedModules}/${diagnostics.totalModules} loaded`);
        this.terminal.writeln('');

        if (this.terminal.shellManager) {
            this.terminal.writeln('✅ Full shell access available');
        } else {
            this.terminal.writeln('⚠️ Limited mode - echo only');
            this.setupEchoMode();
        }

        this.terminal.writeln('');
        this.terminal.write('$ ');
    }

    setupEchoMode() {
        this.terminal.onData((data) => {
            if (data === '\r') {
                this.terminal.write('\r\n$ ');
            } else {
                this.terminal.write(data);
            }
        });
    }

    getTheme() {
        const themes = {
            default: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#00ff88'
            },
            neon: {
                background: '#0a0a0a',
                foreground: '#00ffff',
                cursor: '#ff0080'
            },
            ocean: {
                background: '#001122',
                foreground: '#66d9ef',
                cursor: '#ffd93d'
            }
        };

        return themes[this.config.ui.theme] || themes.default;
    }

    updateStatus(phase, progress, message) {
        this.status = { phase, progress, message };
        this.eventEmitter.dispatchEvent(new CustomEvent('statusUpdate', {
            detail: this.status
        }));
        console.log(`🔄 [${progress}%] ${message}`);
    }

    getDiagnostics() {
        return {
            runtime: {
                bootTime: Date.now() - this.startTime,
                environment: this.environment,
                status: this.status
            },
            modules: this.registry ? this.registry.getDiagnostics() : null,
            terminal: this.terminal ? {
                active: true,
                hasShell: !!this.terminal.shellManager
            } : null
        };
    }

    on(event, callback) {
        this.eventEmitter.addEventListener(event, callback);
    }

    getModule(name) {
        return this.registry ? this.registry.get(name) : null;
    }
}

/**
 * 🎯 Global Boot Function
 */
export async function bootRinaWarp(config = {}) {
    const runtime = new UnifiedRuntime(config);
    
    // Make runtime globally accessible for diagnostics
    window.rinaWarpRuntime = runtime;
    
    await runtime.boot();
    return runtime;
}

// Auto-export for ES modules
export default UnifiedRuntime;
