/**
 * RinaWarp Terminal - Next Generation UI
 * Copyright (c) 2025 RinaWarp Technologies
 * 
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 * 
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * Project repository: https://github.com/rinawarp/terminal
 */
class NextGenUIEngine {
    constructor() {
        this.visualizationEngine = new ThreeDVisualizationEngine();
        this.commandFlowVisualizer = new CommandFlowVisualizer();
        this.gestureController = new GestureController();
        this.adaptiveInterface = new AdaptiveInterface();
        this.holoMode = new HolographicMode();
        this.interactiveTutorials = new InteractiveTutorialSystem();
        this.contextualHints = new ContextualHintSystem();
        this.isInitialized = false;
        this.currentMode = '2D'; // '2D', '3D', 'AR', 'VR'
    }

    async initialize() {
        if (this.isInitialized) return;
        
        await this.setupVisualizationCanvas();
        await this.initializeGestureRecognition();
        await this.setupAdaptiveInterface();
        await this.loadInteractiveComponents();
        
        this.isInitialized = true;
        console.log('Next-Gen UI Engine initialized successfully!');
    }

    async setupVisualizationCanvas() {
        console.log('Setting up visualization canvas...');
        
        // Create visualization canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'visualization-canvas-container';
        canvasContainer.className = 'visualization-canvas hidden';
        
        // Create main visualization canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'visualization-canvas';
        canvas.width = 800;
        canvas.height = 600;
        
        canvasContainer.appendChild(canvas);
        document.body.appendChild(canvasContainer);
        
        // Initialize canvas context
        this.canvasContext = canvas.getContext('2d');
        
        console.log('Visualization canvas setup complete');
    }

    async initializeGestureRecognition() {
        console.log('Initializing gesture recognition...');
        try {
            await this.enableGestureControl();
            console.log('Gesture recognition initialized successfully');
        } catch (error) {
            console.warn('Gesture recognition initialization failed:', error);
        }
    }

    async setupAdaptiveInterface() {
        console.log('Setting up adaptive interface...');
        try {
            await this.enableAdaptiveInterface();
            console.log('Adaptive interface setup complete');
        } catch (error) {
            console.warn('Adaptive interface setup failed:', error);
        }
    }

    async loadInteractiveComponents() {
        console.log('Loading interactive components...');
        try {
            // Initialize contextual hints
            this.contextualHints = new ContextualHintSystem();
            await this.contextualHints.initialize();
            
            // Load any additional interactive components
            this.loadQuickActionsPanel();
            this.loadCommandSuggestionEngine();
            
            console.log('Interactive components loaded successfully');
        } catch (error) {
            console.warn('Interactive components loading failed:', error);
        }
    }

    loadQuickActionsPanel() {
        console.log('Loading quick actions panel...');
        // Quick actions panel will be created dynamically when needed
    }

    loadCommandSuggestionEngine() {
        console.log('Loading command suggestion engine...');
        // Command suggestions are handled by the AI system
    }

    
    async enable3DMode() {
        if (!this.isInitialized) await this.initialize();
        
        this.currentMode = '3D';
        await this.visualizationEngine.activate();
        
        // Transform terminal into 3D space
        const terminalContainer = document.querySelector('.terminal-container');
        terminalContainer.classList.add('mode-3d');
        
        // Create 3D file system visualization
        await this.visualizationEngine.create3DFileSystem();
        
        // Add 3D command history visualization
        await this.visualizationEngine.create3DCommandFlow();
        
        // Enable 3D navigation
        this.enable3DNavigation();
        
        this.showModeTransitionAnimation('3D Mode Activated');
    }

    async disable3DMode() {
        this.currentMode = '2D';
        await this.visualizationEngine.deactivate();
        
        const terminalContainer = document.querySelector('.terminal-container');
        terminalContainer.classList.remove('mode-3d');
        
        this.showModeTransitionAnimation('2D Mode Activated');
    }

    
    async visualizeCommandFlow(command) {
        const flowData = this.parseCommandFlow(command);
        return await this.commandFlowVisualizer.createFlowDiagram(flowData);
    }

    parseCommandFlow(command) {
        // Parse command into flow components
        const components = [];
        
        // Handle pipes
        if (command.includes('|')) {
            const parts = command.split('|').map(part => part.trim());
            parts.forEach((part, index) => {
                components.push({
                    type: 'command',
                    command: part,
                    order: index,
                    connections: index < parts.length - 1 ? [index + 1] : []
                });
            });
        }
        // Handle redirections
        else if (command.includes('>') || command.includes('<')) {
            const redirections = this.parseRedirections(command);
            components.push(...redirections);
        }
        // Handle logical operators
        else if (command.includes('&&') || command.includes('||')) {
            const logical = this.parseLogicalOperators(command);
            components.push(...logical);
        }
        // Single command
        else {
            components.push({
                type: 'command',
                command: command,
                order: 0,
                connections: []
            });
        }
        
        return {
            components: components,
            complexity: this.calculateFlowComplexity(components),
            estimatedTime: this.estimateExecutionTime(components)
        };
    }

    
    async enableGestureControl() {
        try {
            await this.gestureController.initialize();
            
            // Define gesture mappings
            const gestures = {
                'swipe-right': () => this.switchToNextTab(),
                'swipe-left': () => this.switchToPreviousTab(),
                'swipe-up': () => this.showCommandHistory(),
                'swipe-down': () => this.hideCommandHistory(),
                'pinch-out': () => this.increaseFontSize(),
            'pinch-in': () => this.decreaseFontSize(),
            'circle-clockwise': () => this.enable3DMode(),
            'circle-counterclockwise': () => this.disable3DMode(),
            'double-tap': () => this.showQuickActions(),
            'long-press': () => this.showContextMenu()
        };
        
        // Register gesture handlers
        for (const [gesture, handler] of Object.entries(gestures)) {
            this.gestureController.registerGesture(gesture, handler);
        }
        
        console.log('Gesture control enabled with', Object.keys(gestures).length, 'gestures');
        } catch (error) {
            console.warn('Error enabling gesture control:', error);
        }
    }

    
    async enableAdaptiveInterface() {
        await this.adaptiveInterface.initialize();
        
        // Context analyzers
        this.adaptiveInterface.addContextAnalyzer('taskType', this.analyzeCurrentTask.bind(this));
        this.adaptiveInterface.addContextAnalyzer('userStress', this.analyzeUserStress.bind(this));
        this.adaptiveInterface.addContextAnalyzer('timeOfDay', this.analyzeTimeContext.bind(this));
        this.adaptiveInterface.addContextAnalyzer('projectType', this.analyzeProjectType.bind(this));
        
        // Adaptation rules
        this.adaptiveInterface.addAdaptationRule({
            condition: (context) => context.taskType === 'debugging',
            adaptation: () => this.enableDebuggingMode()
        });
        
        this.adaptiveInterface.addAdaptationRule({
            condition: (context) => context.userStress > 0.7,
            adaptation: () => this.enableCalmedMode()
        });
        
        this.adaptiveInterface.addAdaptationRule({
            condition: (context) => context.timeOfDay === 'night',
            adaptation: () => this.enableNightMode()
        });
        
        // Start monitoring
        this.adaptiveInterface.startMonitoring();
    }

    
    async startInteractiveTutorial(topic) {
        const tutorials = {
            'basic-commands': this.createBasicCommandsTutorial(),
            'git-workflow': this.createGitWorkflowTutorial(),
            'docker-basics': this.createDockerBasicsTutorial(),
            'advanced-scripting': this.createAdvancedScriptingTutorial(),
            '3d-navigation': this.create3DNavigationTutorial()
        };
        
        const tutorial = tutorials[topic];
        if (!tutorial) {
            throw new Error(`Tutorial '${topic}' not found`);
        }
        
        return await this.interactiveTutorials.startTutorial(tutorial);
    }

    createBasicCommandsTutorial() {
        return {
            id: 'basic-commands',
            title: 'Terminal Basics',
            description: 'Learn essential terminal commands',
            steps: [
                {
                    title: 'Navigation',
                    description: 'Learn to navigate directories',
                    command: 'ls',
                    expectedOutput: /^total/,
                    hint: 'This lists all files and directories in the current location',
                    nextCommands: ['pwd', 'cd ..']
                },
                {
                    title: 'File Operations',
                    description: 'Create and manipulate files',
                    command: 'touch test.txt',
                    expectedOutput: '',
                    hint: 'Creates an empty file named test.txt',
                    validation: () => require('fs').existsSync('test.txt')
                },
                {
                    title: 'Text Viewing',
                    description: 'View file contents',
                    command: 'echo "Hello World" > test.txt && cat test.txt',
                    expectedOutput: /Hello World/,
                    hint: 'This writes text to a file and then displays it'
                }
            ]
        };
    }

    
    async enableHolographicMode() {
        if (!this.holoMode.isSupported()) {
            throw new Error('Holographic mode not supported on this device');
        }
        
        await this.holoMode.initialize();
        
        // Create holographic terminal space
        const holoSpace = await this.holoMode.createHolographicSpace({
            dimensions: { width: 2, height: 1.5, depth: 1 },
            position: { x: 0, y: 0.8, z: -1.5 },
            terminalPanels: 3,
            floatingElements: true
        });
        
        // Add floating command palette
        await this.holoMode.addFloatingElement({
            type: 'command-palette',
            position: { x: -0.5, y: 1.2, z: -1 },
            size: { width: 0.3, height: 0.8 }
        });
        
        // Add gesture-controlled file browser
        await this.holoMode.addFloatingElement({
            type: 'file-browser',
            position: { x: 0.5, y: 1.2, z: -1 },
            size: { width: 0.4, height: 1 }
        });
        
        this.currentMode = 'AR';
        console.log('Holographic mode activated!');
    }

    
    // Missing methods that are referenced in adaptive interface
    enableNightMode() {
        console.log('🌙 Enabling night mode...');
        document.body.classList.add('night-mode');
        // Apply dark theme styles
        const terminal = document.querySelector('.terminal');
        if (terminal) {
            terminal.style.backgroundColor = '#0d1117';
            terminal.style.color = '#c9d1d9';
        }
    }
    
    enableDebuggingMode() {
        console.log('🐛 Enabling debugging mode...');
        document.body.classList.add('debugging-mode');
        // Show debugging panels and tools
    }
    
    enableCalmedMode() {
        console.log('😌 Enabling calmed mode for stress reduction...');
        document.body.classList.add('calmed-mode');
        // Apply calming colors and reduce visual noise
    }
    
    switchToNextTab() {
        console.log('➡️ Switching to next tab');
        // Tab switching logic
    }
    
    switchToPreviousTab() {
        console.log('⬅️ Switching to previous tab');
        // Tab switching logic
    }
    
    showCommandHistory() {
        console.log('📜 Showing command history');
        // Show command history panel
    }
    
    hideCommandHistory() {
        console.log('🙈 Hiding command history');
        // Hide command history panel
    }
    
    increaseFontSize() {
        console.log('🔍 Increasing font size');
        // Font size increase logic
    }
    
    decreaseFontSize() {
        console.log('🔍 Decreasing font size');
        // Font size decrease logic
    }
    
    
    showQuickActions() {
        console.log('⚡ Showing quick actions panel');
        // Quick actions panel logic
    }
    
    showContextMenu() {
        console.log('📋 Showing context menu');
        // Context menu logic
    }
    
    analyzeCurrentTask() {
        // Analyze what the user is currently doing
        const lastCommand = this.getLastCommand();
        if (lastCommand) {
            if (lastCommand.includes('git') || lastCommand.includes('debug') || lastCommand.includes('gdb')) {
                return 'debugging';
            } else if (lastCommand.includes('npm') || lastCommand.includes('node') || lastCommand.includes('python')) {
                return 'development';
            }
        }
        return 'general';
    }
    
    analyzeUserStress() {
        // Simple stress detection based on typing patterns
        return Math.random() * 0.5; // Placeholder - would use real metrics
    }
    
    analyzeTimeContext() {
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 6) {
            return 'night';
        } else if (hour >= 6 && hour <= 12) {
            return 'morning';
        } else if (hour >= 12 && hour <= 18) {
            return 'afternoon';
        } else {
            return 'evening';
        }
    }
    
    analyzeProjectType() {
        // Analyze project type based on files in current directory
        return 'web'; // Placeholder
    }
    
    getLastCommand() {
        // Get the last executed command
        return window.lastExecutedCommand || '';
    }

    async optimizeLayoutForTask(taskType) {
        const layouts = {
            'development': {
                panels: ['terminal', 'file-tree', 'git-status'],
                arrangement: 'triple-column',
                terminalRatio: 0.6
            },
            'debugging': {
                panels: ['terminal', 'debug-console', 'variable-inspector'],
                arrangement: 'debug-mode',
                terminalRatio: 0.4
            },
            'deployment': {
                panels: ['terminal', 'deployment-status', 'logs'],
                arrangement: 'monitoring-mode',
                terminalRatio: 0.5
            },
            'learning': {
                panels: ['terminal', 'tutorial', 'reference'],
                arrangement: 'learning-mode',
                terminalRatio: 0.4
            }
        };
        
        const layout = layouts[taskType] || layouts['development'];
        await this.applyLayout(layout);
    }

    async applyLayout(layout) {
        const container = document.querySelector('.terminal-container');
        
        // Remove existing layout classes
        container.classList.remove('triple-column', 'debug-mode', 'monitoring-mode', 'learning-mode');
        
        // Apply new layout
        container.classList.add(layout.arrangement);
        
        // Adjust terminal size
        const terminal = container.querySelector('.terminal');
        terminal.style.flex = `${layout.terminalRatio}`;
        
        // Show/hide panels based on layout
        layout.panels.forEach(panel => {
            const element = document.querySelector(`.${panel}`);
            if (element) {
                element.style.display = 'block';
            }
        });
        
        // Trigger resize event for terminal
        window.dispatchEvent(new Event('resize'));
        
        this.showNotification(`Layout optimized for ${layout.arrangement}`);
    }

    
    updateUIForContext(context) {
        // Update color scheme based on context
        if (context.environment === 'production') {
            this.applyProductionWarningTheme();
        } else if (context.environment === 'development') {
            this.applyDevelopmentTheme();
        }
        
        // Show relevant quick actions
        this.updateQuickActions(context);
        
        // Adjust interface complexity based on user expertise
        if (context.userLevel === 'beginner') {
            this.enableBeginnerMode();
        } else if (context.userLevel === 'expert') {
            this.enableExpertMode();
        }
    }

    
    updateQuickActions(context) {
        const quickActions = [];
        
        // Git-related actions
        if (context.isGitRepo) {
            quickActions.push(
                { icon: '🔄', label: 'Git Status', command: 'git status' },
                { icon: '📝', label: 'Commit', action: () => this.showCommitDialog() },
                { icon: '🚀', label: 'Push', command: 'git push' }
            );
        }
        
        // Node.js project actions
        if (context.hasPackageJson) {
            quickActions.push(
                { icon: '📦', label: 'Install', command: 'npm install' },
                { icon: '▶️', label: 'Start', command: 'npm start' },
                { icon: '🧪', label: 'Test', command: 'npm test' }
            );
        }
        
        // Docker actions
        if (context.hasDockerfile) {
            quickActions.push(
                { icon: '🐳', label: 'Build', action: () => this.showDockerBuildDialog() },
                { icon: '🏃', label: 'Run', action: () => this.showDockerRunDialog() }
            );
        }
        
        this.renderQuickActions(quickActions);
    }

    renderQuickActions(actions) {
        let quickActionsPanel = document.querySelector('.quick-actions-panel');
        if (!quickActionsPanel) {
            quickActionsPanel = document.createElement('div');
            quickActionsPanel.className = 'quick-actions-panel';
            document.body.appendChild(quickActionsPanel);
        }
        
        quickActionsPanel.innerHTML = actions.map(action => `
            <button class="quick-action-btn" data-command="${action.command || ''}" data-action="${action.action || ''}">
                <span class="action-icon">${action.icon}</span>
                <span class="action-label">${action.label}</span>
            </button>
        `).join('');
        
        // Attach event listeners
        quickActionsPanel.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.currentTarget.dataset.command;
                const action = e.currentTarget.dataset.action;
                
                if (command) {
                    this.executeCommand(command);
                } else if (action) {
                    eval(action)();
                }
            });
        });
    }

    // Helper Methods
    showModeTransitionAnimation(message) {
        const overlay = document.createElement('div');
        overlay.className = 'mode-transition-overlay';
        overlay.innerHTML = `
            <div class="transition-content">
                <div class="transition-icon">🚀</div>
                <div class="transition-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 2000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

}


class ThreeDVisualizationEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isActive = false;
    }

    async activate() {
        if (!window.THREE) {
            await this.loadThreeJS();
        }
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.startRenderLoop();
        
        this.isActive = true;
    }

    async loadThreeJS() {
        // In a real implementation, load Three.js library
        console.log('Loading Three.js for 3D visualization...');
    }

    setupScene() {
        // Mock 3D scene setup
        console.log('Setting up 3D scene...');
    }

    async create3DFileSystem() {
        console.log('Creating 3D file system visualization...');
    }

    async create3DCommandFlow() {
        console.log('Creating 3D command flow visualization...');
    }

    async deactivate() {
        this.isActive = false;
        console.log('3D visualization deactivated');
    }
}

class CommandFlowVisualizer {
    async createFlowDiagram(flowData) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.className = 'command-flow-diagram';
        
        const ctx = canvas.getContext('2d');
        
        // Draw flow components
        flowData.components.forEach((component, index) => {
            this.drawComponent(ctx, component, index);
        });
        
        // Draw connections
        this.drawConnections(ctx, flowData.components);
        
        return canvas;
    }

    drawComponent(ctx, component, index) {
        const x = 50 + (index * 150);
        const y = 200;
        const width = 120;
        const height = 60;
        
        // Draw component box
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(x, y, width, height);
        
        // Draw component text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(component.command, x + width/2, y + height/2 + 5);
    }

    drawConnections(ctx, components) {
        components.forEach((component, index) => {
            component.connections.forEach(targetIndex => {
                this.drawArrow(ctx, 
                    50 + (index * 150) + 120, 230,
                    50 + (targetIndex * 150), 230
                );
            });
        });
    }

    drawArrow(ctx, fromX, fromY, toX, toY) {
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI/6), toY - 10 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI/6), toY - 10 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();
    }
}

class GestureController {
    constructor() {
        this.gestureHandlers = new Map();
        this.isListening = false;
    }

    async initialize() {
        // Initialize gesture recognition
        this.setupTouchEvents();
        this.setupMouseEvents();
        this.isListening = true;
    }

    setupTouchEvents() {
        let startX, startY, startTime;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const gesture = this.recognizeGesture(startX, startY, endX, endY, endTime - startTime);
            if (gesture) {
                this.handleGesture(gesture);
            }
        });
    }

    setupMouseEvents() {
        // Similar to touch events but for mouse
    }

    recognizeGesture(startX, startY, endX, endY, duration) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < 10 && duration < 300) {
            return 'tap';
        }
        
        if (distance > 50) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                return deltaX > 0 ? 'swipe-right' : 'swipe-left';
            } else {
                return deltaY > 0 ? 'swipe-down' : 'swipe-up';
            }
        }
        
        return null;
    }

    registerGesture(gesture, handler) {
        this.gestureHandlers.set(gesture, handler);
    }

    handleGesture(gesture) {
        const handler = this.gestureHandlers.get(gesture);
        if (handler) {
            handler();
        }
    }
}

class AdaptiveInterface {
    constructor() {
        this.contextAnalyzers = new Map();
        this.adaptationRules = [];
        this.currentContext = {};
        this.monitoringInterval = null;
    }

    async initialize() {
        console.log('Adaptive interface initialized');
    }

    addContextAnalyzer(name, analyzer) {
        this.contextAnalyzers.set(name, analyzer);
    }

    addAdaptationRule(rule) {
        this.adaptationRules.push(rule);
    }

    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.analyzeContext();
            this.applyAdaptations();
        }, 5000); // Check every 5 seconds
    }

    async analyzeContext() {
        for (const [name, analyzer] of this.contextAnalyzers) {
            this.currentContext[name] = await analyzer();
        }
    }

    applyAdaptations() {
        this.adaptationRules.forEach(rule => {
            if (rule.condition(this.currentContext)) {
                rule.adaptation();
            }
        });
    }
}

class InteractiveTutorialSystem {
    async startTutorial(tutorial) {
        const tutorialOverlay = this.createTutorialOverlay(tutorial);
        document.body.appendChild(tutorialOverlay);
        
        return new Promise((resolve) => {
            this.runTutorialSteps(tutorial, resolve);
        });
    }

    createTutorialOverlay(tutorial) {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-content">
                <div class="tutorial-header">
                    <h2>${tutorial.title}</h2>
                    <p>${tutorial.description}</p>
                </div>
                <div class="tutorial-step" id="current-step">
                    <!-- Step content will be inserted here -->
                </div>
                <div class="tutorial-controls">
                    <button id="tutorial-prev" disabled>Previous</button>
                    <button id="tutorial-next">Next</button>
                    <button id="tutorial-skip">Skip Tutorial</button>
                </div>
            </div>
        `;
        
        return overlay;
    }

    async runTutorialSteps(tutorial, resolve) {
        let currentStep = 0;
        
        const showStep = (stepIndex) => {
            const step = tutorial.steps[stepIndex];
            const stepElement = document.getElementById('current-step');
            
            stepElement.innerHTML = `
                <h3>${step.title}</h3>
                <p>${step.description}</p>
                <div class="step-command">
                    <code>${step.command}</code>
                    <button class="try-command">Try it!</button>
                </div>
                <div class="step-hint">${step.hint}</div>
            `;
            
            // Update navigation buttons
            document.getElementById('tutorial-prev').disabled = stepIndex === 0;
            document.getElementById('tutorial-next').textContent = 
                stepIndex === tutorial.steps.length - 1 ? 'Finish' : 'Next';
        };
        
        showStep(currentStep);
        
        // Handle navigation
        document.getElementById('tutorial-next').addEventListener('click', () => {
            if (currentStep < tutorial.steps.length - 1) {
                currentStep++;
                showStep(currentStep);
            } else {
                this.closeTutorial();
                resolve({ completed: true });
            }
        });
        
        document.getElementById('tutorial-prev').addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });
        
        document.getElementById('tutorial-skip').addEventListener('click', () => {
            this.closeTutorial();
            resolve({ completed: false, skipped: true });
        });
    }

    closeTutorial() {
        const overlay = document.querySelector('.tutorial-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

class ContextualHintSystem {
    constructor() {
        this.hints = new Map();
        this.contextAnalyzers = [];
        this.isActive = false;
    }

    async initialize() {
        console.log('Initializing contextual hint system...');
        this.setupDefaultHints();
        this.isActive = true;
    }

    setupDefaultHints() {
        // Default hints for common scenarios
        this.addHint('git-uncommitted', {
            condition: () => this.hasUncommittedChanges(),
            message: 'You have uncommitted changes. Consider using "git commit" to save your work.',
            priority: 'medium'
        });

        this.addHint('large-output', {
            condition: (context) => context.outputLines > 100,
            message: 'Large output detected. Use "| less" or "| head" to paginate results.',
            priority: 'low'
        });

        this.addHint('permission-denied', {
            condition: (context) => context.error && context.error.includes('Permission denied'),
            message: 'Try using "sudo" for administrative commands or check file permissions.',
            priority: 'high'
        });
    }

    addHint(id, hintConfig) {
        this.hints.set(id, hintConfig);
    }

    async analyzeContext(command, result) {
        if (!this.isActive) return null;

        const context = {
            command,
            result,
            outputLines: result?.output?.split('\n').length || 0,
            error: result?.error,
            timestamp: Date.now()
        };

        // Check all hints for applicable ones
        const applicableHints = [];
        for (const [id, hint] of this.hints) {
            try {
                if (hint.condition(context)) {
                    applicableHints.push({ id, ...hint });
                }
            } catch (e) {
                console.warn(`Error evaluating hint ${id}:`, e);
            }
        }

        // Sort by priority and return the highest priority hint
        if (applicableHints.length > 0) {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            applicableHints.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
            return applicableHints[0];
        }

        return null;
    }

    async hasUncommittedChanges() {
        // Simplified check - in real implementation, this would check git status
        return false;
    }

    showHint(hint) {
        const hintElement = document.createElement('div');
        hintElement.className = `contextual-hint priority-${hint.priority}`;
        hintElement.innerHTML = `
            <div class="hint-content">
                <span class="hint-icon">💡</span>
                <span class="hint-message">${hint.message}</span>
                <button class="hint-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        const terminal = document.querySelector('.terminal-container');
        if (terminal) {
            terminal.appendChild(hintElement);
            
            // Auto-dismiss lower priority hints
            if (hint.priority === 'low') {
                setTimeout(() => {
                    if (hintElement.parentElement) {
                        hintElement.remove();
                    }
                }, 5000);
            }
        }
    }
}

class HolographicMode {
    isSupported() {
        // Check if AR/VR is supported
        return 'xr' in navigator || 'getVRDisplays' in navigator;
    }

    async initialize() {
        console.log('Initializing holographic mode...');
    }

    async createHolographicSpace(config) {
        console.log('Creating holographic space with config:', config);
        return { id: 'holo-space-1' };
    }

    async addFloatingElement(element) {
        console.log('Adding floating element:', element);
    }
}

export { NextGenUIEngine };


