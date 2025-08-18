/**
 * RinaWarp Terminal Onboarding System
 * 
 * Provides step-by-step guidance for new users after plan selection
 */

class RinaWarpOnboardingSystem {
    constructor(options = {}) {
        this.options = {
            debug: options.debug || false,
            autoStart: options.autoStart !== false,
            trackingEnabled: options.trackingEnabled !== false,
            ...options
        };

        this.state = {
            currentStep: 0,
            completed: false,
            userPlan: null,
            startTime: null
        };

        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome to RinaWarp Terminal',
                description: 'Thank you for choosing RinaWarp Terminal. Let\'s get you set up.',
                action: 'Continue Setup',
                skippable: false
            },
            {
                id: 'account_setup',
                title: 'Create Your Account',
                description: 'Set up your account to sync settings across devices.',
                action: 'Create Account',
                skippable: true
            },
            {
                id: 'download_install',
                title: 'Download & Install',
                description: 'Download RinaWarp Terminal for your operating system.',
                action: 'Download Now',
                skippable: false
            },
            {
                id: 'basic_setup',
                title: 'Basic Configuration',
                description: 'Configure your terminal preferences and choose a theme.',
                action: 'Configure Settings',
                skippable: true
            },
            {
                id: 'first_command',
                title: 'Try Your First AI Command',
                description: 'Experience the AI assistance with a simple command.',
                action: 'Try AI Assistant',
                skippable: true
            },
            {
                id: 'complete',
                title: 'Setup Complete',
                description: 'You\'re all set! Start using RinaWarp Terminal.',
                action: 'Start Using Terminal',
                skippable: false
            }
        ];

        this.elements = {};
        this.init();
    }

    /**
     * Initialize the onboarding system
     */
    init() {
        this.log('🚀 Initializing Onboarding System');
        
        if (this.options.autoStart) {
            this.createOnboardingUI();
        }

        // Listen for plan selection events
        this.listenForPlanSelection();
    }

    /**
     * Listen for plan selection to trigger onboarding
     */
    listenForPlanSelection() {
        document.addEventListener('planSelected', (event) => {
            this.state.userPlan = event.detail.plan;
            this.startOnboarding();
        });

        // Also listen for CTA button clicks as backup
        document.querySelectorAll('.cta-button').forEach(button => {
            button.addEventListener('click', () => {
                const plan = button.getAttribute('data-plan');
                if (plan) {
                    setTimeout(() => {
                        this.state.userPlan = plan;
                        this.startOnboarding();
                    }, 2000); // Delay to allow checkout process
                }
            });
        });
    }

    /**
     * Start the onboarding process
     */
    startOnboarding() {
        if (this.state.completed) return;

        this.log('🎯 Starting onboarding for plan:', this.state.userPlan);
        
        this.state.startTime = Date.now();
        this.state.currentStep = 0;
        
        this.trackEvent('onboarding_started', {
            user_plan: this.state.userPlan,
            total_steps: this.steps.length
        });

        this.createOnboardingUI();
        this.showOnboarding();
    }

    /**
     * Create the onboarding UI elements
     */
    createOnboardingUI() {
        // Remove existing onboarding if present
        const existingOnboarding = document.querySelector('.onboarding-overlay');
        if (existingOnboarding) {
            existingOnboarding.remove();
        }

        // Create main overlay
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-header">
                    <div class="step-indicator">
                        <span class="current-step">1</span>
                        <span class="total-steps"> of ${this.steps.length}</span>
                    </div>
                    <button class="onboarding-close" title="Close">&times;</button>
                </div>
                
                <div class="onboarding-content">
                    <h2 class="step-title"></h2>
                    <p class="step-description"></p>
                    
                    <div class="step-specific-content"></div>
                </div>
                
                <div class="onboarding-footer">
                    <button class="onboarding-btn secondary" id="skip-step" style="display: none;">Skip</button>
                    <div class="button-group">
                        <button class="onboarding-btn secondary" id="previous-step" style="display: none;">Previous</button>
                        <button class="onboarding-btn primary" id="next-step">Continue</button>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        `;

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .onboarding-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .onboarding-overlay.show {
                opacity: 1;
            }
            
            .onboarding-modal {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .onboarding-overlay.show .onboarding-modal {
                transform: scale(1);
            }
            
            .onboarding-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px 0;
                color: white;
            }
            
            .step-indicator {
                font-size: 0.9rem;
                color: #94a3b8;
            }
            
            .current-step {
                color: #3b82f6;
                font-weight: 600;
            }
            
            .onboarding-close {
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }
            
            .onboarding-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .onboarding-content {
                padding: 24px;
                color: white;
            }
            
            .step-title {
                margin: 0 0 12px 0;
                font-size: 1.5rem;
                color: white;
            }
            
            .step-description {
                margin: 0 0 24px 0;
                color: #94a3b8;
                line-height: 1.6;
            }
            
            .step-specific-content {
                margin-bottom: 24px;
            }
            
            .onboarding-footer {
                padding: 0 24px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .button-group {
                display: flex;
                gap: 12px;
            }
            
            .onboarding-btn {
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                font-size: 0.9rem;
            }
            
            .onboarding-btn.primary {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
            }
            
            .onboarding-btn.primary:hover {
                background: linear-gradient(135deg, #1d4ed8, #1e40af);
                transform: translateY(-1px);
            }
            
            .onboarding-btn.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #94a3b8;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .onboarding-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            .progress-bar {
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #06b6d4);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .download-links {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
                margin: 16px 0;
            }
            
            .download-link {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 16px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                text-decoration: none;
                color: white;
                transition: background-color 0.2s ease;
            }
            
            .download-link:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .download-icon {
                font-size: 2rem;
                margin-bottom: 8px;
            }
            
            .theme-selector {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 16px 0;
            }
            
            .theme-option {
                background: #1e293b;
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: border-color 0.2s ease;
                text-align: center;
            }
            
            .theme-option:hover,
            .theme-option.selected {
                border-color: #3b82f6;
            }
            
            .theme-preview {
                width: 100%;
                height: 40px;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            .theme-name {
                font-size: 0.8rem;
                color: #94a3b8;
            }
            
            @media (max-width: 600px) {
                .onboarding-modal {
                    width: 95%;
                    margin: 20px;
                }
                
                .button-group {
                    flex-direction: column;
                    width: 100%;
                }
                
                .onboarding-btn {
                    width: 100%;
                }
                
                .onboarding-footer {
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(overlay);

        // Store references
        this.elements = {
            overlay,
            modal: overlay.querySelector('.onboarding-modal'),
            stepIndicator: overlay.querySelector('.current-step'),
            title: overlay.querySelector('.step-title'),
            description: overlay.querySelector('.step-description'),
            content: overlay.querySelector('.step-specific-content'),
            closeBtn: overlay.querySelector('.onboarding-close'),
            skipBtn: overlay.querySelector('#skip-step'),
            prevBtn: overlay.querySelector('#previous-step'),
            nextBtn: overlay.querySelector('#next-step'),
            progressFill: overlay.querySelector('.progress-fill')
        };

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for the onboarding UI
     */
    setupEventListeners() {
        this.elements.closeBtn.addEventListener('click', () => {
            this.closeOnboarding();
        });

        this.elements.skipBtn.addEventListener('click', () => {
            this.skipStep();
        });

        this.elements.prevBtn.addEventListener('click', () => {
            this.previousStep();
        });

        this.elements.nextBtn.addEventListener('click', () => {
            this.nextStep();
        });

        // Close on overlay click (but not modal click)
        this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                this.closeOnboarding();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.overlay.classList.contains('show')) {
                this.closeOnboarding();
            }
        });
    }

    /**
     * Show the onboarding overlay
     */
    showOnboarding() {
        this.updateStepContent();
        this.elements.overlay.classList.add('show');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Update the content for the current step
     */
    updateStepContent() {
        const step = this.steps[this.state.currentStep];
        if (!step) return;

        // Update basic content
        this.elements.stepIndicator.textContent = this.state.currentStep + 1;
        this.elements.title.textContent = step.title;
        this.elements.description.textContent = step.description;
        this.elements.nextBtn.textContent = step.action;

        // Update progress
        const progress = ((this.state.currentStep + 1) / this.steps.length) * 100;
        this.elements.progressFill.style.width = `${progress}%`;

        // Show/hide navigation buttons
        this.elements.prevBtn.style.display = this.state.currentStep > 0 ? 'block' : 'none';
        this.elements.skipBtn.style.display = step.skippable ? 'block' : 'none';

        // Add step-specific content
        this.addStepSpecificContent(step);

        // Track step view
        this.trackEvent('onboarding_step_viewed', {
            step_id: step.id,
            step_number: this.state.currentStep + 1,
            user_plan: this.state.userPlan
        });
    }

    /**
     * Add content specific to each step
     */
    addStepSpecificContent(step) {
        this.elements.content.innerHTML = '';

        switch (step.id) {
            case 'welcome':
                this.elements.content.innerHTML = `
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 3rem; margin-bottom: 12px;">🚀</div>
                        <p>You've selected the <strong>${this.state.userPlan || 'Personal'}</strong> plan.</p>
                        <p>Let's get you up and running in just a few minutes.</p>
                    </div>
                `;
                break;

            case 'download_install':
                this.elements.content.innerHTML = `
                    <div class="download-links">
                        <a href="#" class="download-link" data-os="mac">
                            <div class="download-icon">🍎</div>
                            <div>macOS</div>
                        </a>
                        <a href="#" class="download-link" data-os="windows">
                            <div class="download-icon">🖥️</div>
                            <div>Windows</div>
                        </a>
                        <a href="#" class="download-link" data-os="linux">
                            <div class="download-icon">🐧</div>
                            <div>Linux</div>
                        </a>
                    </div>
                    <p style="font-size: 0.9rem; color: #94a3b8; text-align: center;">
                        Choose your operating system to download RinaWarp Terminal
                    </p>
                `;
                
                // Add download link listeners
                this.elements.content.querySelectorAll('.download-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const os = link.dataset.os;
                        this.handleDownload(os);
                    });
                });
                break;

            case 'basic_setup':
                this.elements.content.innerHTML = `
                    <p style="margin-bottom: 16px;">Choose your preferred terminal theme:</p>
                    <div class="theme-selector">
                        <div class="theme-option" data-theme="dark">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #0f172a, #1e293b);"></div>
                            <div class="theme-name">Dark</div>
                        </div>
                        <div class="theme-option" data-theme="blue">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #1e40af, #3b82f6);"></div>
                            <div class="theme-name">Ocean</div>
                        </div>
                        <div class="theme-option selected" data-theme="purple">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #7c3aed, #a855f7);"></div>
                            <div class="theme-name">Purple</div>
                        </div>
                    </div>
                `;
                
                // Add theme selection listeners
                this.elements.content.querySelectorAll('.theme-option').forEach(option => {
                    option.addEventListener('click', () => {
                        this.elements.content.querySelectorAll('.theme-option').forEach(opt => 
                            opt.classList.remove('selected')
                        );
                        option.classList.add('selected');
                        
                        const theme = option.dataset.theme;
                        this.trackEvent('theme_selected', {
                            theme: theme,
                            step: 'onboarding'
                        });
                    });
                });
                break;

            case 'first_command':
                this.elements.content.innerHTML = `
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 16px; border-radius: 8px; font-family: monospace; margin: 16px 0;">
                        <div style="color: #22c55e;">$ </div>
                        <div style="color: #94a3b8; margin: 8px 0;">Try typing: <strong style="color: white;">ls -la</strong></div>
                        <div style="color: #06b6d4; font-size: 0.9rem;">💡 AI Assistant: Lists all files with detailed information</div>
                    </div>
                    <p style="font-size: 0.9rem; color: #94a3b8;">
                        The AI assistant provides helpful suggestions and explanations for your commands.
                    </p>
                `;
                break;

            case 'complete':
                this.elements.content.innerHTML = `
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 3rem; margin-bottom: 12px;">✨</div>
                        <p>Congratulations! You're ready to start using RinaWarp Terminal.</p>
                        <div style="margin-top: 20px; padding: 16px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; border-left: 3px solid #22c55e;">
                            <p style="color: #22c55e; font-weight: 600; margin: 0;">Quick Tips:</p>
                            <ul style="margin: 8px 0 0 20px; color: #94a3b8; font-size: 0.9rem;">
                                <li>Press Tab for AI-powered autocomplete</li>
                                <li>Use voice commands by saying "Hey Terminal"</li>
                                <li>Access settings with Cmd/Ctrl + ,</li>
                            </ul>
                        </div>
                    </div>
                `;
                break;
        }
    }

    /**
     * Handle download button click
     */
    handleDownload(os) {
        this.trackEvent('download_clicked', {
            operating_system: os,
            user_plan: this.state.userPlan,
            step: 'onboarding'
        });

        // In a real implementation, this would trigger the actual download
        this.log(`Download requested for: ${os}`);
        
        // Show download started message
        alert(`Download for ${os} will begin shortly. Check your downloads folder.`);
    }

    /**
     * Go to next step
     */
    nextStep() {
        const currentStep = this.steps[this.state.currentStep];
        
        this.trackEvent('onboarding_step_completed', {
            step_id: currentStep.id,
            step_number: this.state.currentStep + 1,
            user_plan: this.state.userPlan,
            completion_method: 'next_button'
        });

        if (this.state.currentStep < this.steps.length - 1) {
            this.state.currentStep++;
            this.updateStepContent();
        } else {
            this.completeOnboarding();
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.state.currentStep > 0) {
            this.state.currentStep--;
            this.updateStepContent();
        }
    }

    /**
     * Skip current step
     */
    skipStep() {
        const currentStep = this.steps[this.state.currentStep];
        
        this.trackEvent('onboarding_step_skipped', {
            step_id: currentStep.id,
            step_number: this.state.currentStep + 1,
            user_plan: this.state.userPlan
        });

        this.nextStep();
    }

    /**
     * Complete the onboarding process
     */
    completeOnboarding() {
        const duration = Date.now() - this.state.startTime;
        
        this.trackEvent('onboarding_completed', {
            user_plan: this.state.userPlan,
            duration_seconds: Math.round(duration / 1000),
            steps_completed: this.state.currentStep + 1,
            total_steps: this.steps.length
        });

        this.state.completed = true;
        this.closeOnboarding();
    }

    /**
     * Close the onboarding overlay
     */
    closeOnboarding() {
        if (!this.state.completed && this.state.startTime) {
            const duration = Date.now() - this.state.startTime;
            
            this.trackEvent('onboarding_abandoned', {
                user_plan: this.state.userPlan,
                duration_seconds: Math.round(duration / 1000),
                abandoned_at_step: this.state.currentStep + 1,
                total_steps: this.steps.length
            });
        }

        this.elements.overlay.classList.remove('show');
        
        setTimeout(() => {
            if (this.elements.overlay.parentNode) {
                this.elements.overlay.parentNode.removeChild(this.elements.overlay);
            }
            document.body.style.overflow = '';
        }, 300);
    }

    /**
     * Track events
     */
    trackEvent(eventName, properties = {}) {
        if (!this.options.trackingEnabled) return;

        const eventData = {
            timestamp: Date.now(),
            ...properties
        };

        // Track with Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', eventName, eventData);
        }

        // Track with conversion analytics
        if (window.conversionAnalytics) {
            window.conversionAnalytics.trackEvent(eventName, eventData);
        }

        this.log(`📊 Event tracked: ${eventName}`, eventData);
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.options.debug) {
            console.log('[OnboardingSystem]', ...args);
        }
    }
}

// Auto-initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rinaWarpOnboarding = new RinaWarpOnboardingSystem({
        debug: window.location.hostname === 'localhost',
        autoStart: false, // Only start after plan selection
        trackingEnabled: true
    });
});
