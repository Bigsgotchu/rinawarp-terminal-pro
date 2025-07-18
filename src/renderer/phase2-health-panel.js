/**
 * RinaWarp Terminal - Phase2 System Health Panel
 * "Real-time UI visualization with emoji severity indicators"
 * 
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

import { getSystemStatusSnapshot } from '../utils/error-triage-system.js';

class Phase2HealthPanel {
  constructor() {
    this.isRendered = false;
    this.updateInterval = null;
    this.severityMap = {
      low: '🟢',
      medium: '🟡',
      high: '🔴',
      critical: '🔥'
    };
    
    console.log('🩺 Phase 2 Health Panel initialized');
  }

  renderHealthPanel() {
    const status = getSystemStatusSnapshot();
    
    const panelHTML = `
      <div class="system-health-panel">
        <div class="health-header">
          <h3>🩺 System Health Overview</h3>
          <div class="overall-status ${status.overall.healthy ? 'healthy' : 'unhealthy'}">
            ${status.overall.healthy ? '💚 Healthy' : '🚨 Issues Detected'}
          </div>
        </div>
        
        <div class="health-metrics">
          <div class="metric-card">
            <div class="metric-label">Error Count</div>
            <div class="metric-value">${status.overall.errorCount}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Uptime</div>
            <div class="metric-value">${this.formatUptime(status.overall.uptime)}</div>
          </div>
        </div>
        
        <div class="health-card-grid">
          ${Object.entries(status.modules).map(([mod, moduleStatus]) => `
            <div class="health-card ${this.getHealthCardClass(moduleStatus)}">
              <h4>${this.formatModuleName(mod)}</h4>
              <p>Status: ${moduleStatus.ok ? '✅ Operational' : this.getStatusEmoji(moduleStatus.severity) + ' ' + this.getStatusMessage(moduleStatus)}</p>
              <span class="pulse"></span>
            </div>
          `).join('')}
        </div>
        
        <div class="modules-status">
          <h4>🔧 Detailed Module Status</h4>
          <ul class="module-list">
            ${Object.entries(status.modules).map(([mod, moduleStatus]) => `
              <li class="module-item ${moduleStatus.ok ? 'ok' : 'fault'}">
                <span class="module-icon">${moduleStatus.ok ? '✅' : '❌'}</span>
                <span class="module-name">${this.formatModuleName(mod)}</span>
                <span class="module-severity">${this.severityMap[moduleStatus.severity]}</span>
                <span class="module-status">${moduleStatus.status}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div class="error-categories">
          <h4>📊 Error Categories</h4>
          <div class="category-grid">
            ${Object.entries(status.errorCategories).map(([category, count]) => `
              <div class="category-card ${category.toLowerCase()}">
                <div class="category-icon">${this.getCategoryIcon(category)}</div>
                <div class="category-name">${this.getCategoryName(category)}</div>
                <div class="category-count">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="health-actions">
          <button class="health-btn" onclick="phase2HealthPanel.runDiagnostics()">
            🧪 Run Diagnostics
          </button>
          <button class="health-btn" onclick="phase2HealthPanel.clearErrors()">
            🗑️ Clear Errors
          </button>
          <button class="health-btn" onclick="phase2HealthPanel.exportReport()">
            📥 Export Report
          </button>
        </div>
      </div>
    `;
    
    // Find or create dashboard panel
    let dashboardPanel = document.getElementById('dashboard-panel');
    if (!dashboardPanel) {
      dashboardPanel = document.createElement('div');
      dashboardPanel.id = 'dashboard-panel';
      dashboardPanel.className = 'dashboard-panel';
      document.body.appendChild(dashboardPanel);
    }
    
    dashboardPanel.innerHTML = panelHTML;
    this.isRendered = true;
    
    // Add styles if not already added
    if (!document.getElementById('health-panel-styles')) {
      this.addHealthPanelStyles();
    }
  }

  addHealthPanelStyles() {
    const style = document.createElement('style');
    style.id = 'health-panel-styles';
    style.textContent = `
      .dashboard-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 420px;
        max-height: 80vh;
        background: #121212;
        color: #eee;
        border: 1px solid #333;
        border-radius: 12px;
        box-shadow: 0 0 20px #0ff3;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        overflow-y: auto;
        backdrop-filter: blur(10px);
      }

      .system-health-panel {
        padding: 1.5rem;
      }

      .health-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
      }

      .health-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }

      .overall-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }

      .overall-status.healthy {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }

      .overall-status.unhealthy {
        background: rgba(244, 67, 54, 0.2);
        color: #F44336;
      }

      .health-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 8px;
        text-align: center;
      }

      .metric-label {
        font-size: 10px;
        color: #ccc;
        margin-bottom: 4px;
      }

      .metric-value {
        font-size: 14px;
        font-weight: 600;
        color: #4CAF50;
      }

      .modules-status {
        margin-bottom: 16px;
      }

      .modules-status h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #ccc;
      }

      .module-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .module-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        margin-bottom: 4px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 10px;
      }

      .module-item.ok {
        border-left: 3px solid #4CAF50;
      }

      .module-item.fault {
        border-left: 3px solid #F44336;
      }

      .module-icon {
        font-size: 12px;
      }

      .module-name {
        flex: 1;
        font-weight: 500;
      }

      .module-severity {
        font-size: 12px;
      }

      .module-status {
        font-size: 9px;
        color: #999;
      }

      .error-categories {
        margin-bottom: 16px;
      }

      .error-categories h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #ccc;
      }

      .category-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .category-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
      }

      .category-card.c100 {
        border-left: 3px solid #4CAF50;
      }

      .category-card.w200 {
        border-left: 3px solid #FF9800;
      }

      .category-card.e300 {
        border-left: 3px solid #F44336;
      }

      .category-card.f500 {
        border-left: 3px solid #9C27B0;
      }

      .category-icon {
        font-size: 12px;
      }

      .category-name {
        flex: 1;
        font-weight: 500;
      }

      .category-count {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }

      .health-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .health-btn {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: background 0.2s;
      }

      .health-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .health-btn:active {
        transform: scale(0.95);
      }

      /* Pulsing animation for critical issues */
      .overall-status.unhealthy {
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }

      /* Fade in animation */
      .system-health-panel {
        animation: fadeIn 0.3s ease-in-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Health Card Grid */
      .health-card-grid {
        display: flex;
        gap: 1rem;
        justify-content: space-around;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      
      .health-card {
        background: #1e1e1e;
        padding: 1rem;
        border-radius: 8px;
        width: 180px;
        position: relative;
        box-shadow: 0 0 10px #000;
        transition: 0.3s ease;
        min-height: 80px;
      }
      
      .health-card.ok {
        border-left: 5px solid #2ecc71;
      }
      
      .health-card.warning {
        border-left: 5px solid #f1c40f;
      }
      
      .health-card.fault {
        border-left: 5px solid #e74c3c;
      }
      
      .health-card h4 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 1.1rem;
        color: #fff;
      }
      
      .health-card p {
        margin: 0;
        font-size: 0.9rem;
        color: #ccc;
      }
      
      .pulse {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: currentColor;
        animation: pulse 1.8s infinite ease-in-out;
      }
      
      .ok .pulse { color: #2ecc71; }
      .warning .pulse { color: #f1c40f; }
      .fault .pulse { color: #e74c3c; }
      
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.5); opacity: 0.4; }
        100% { transform: scale(1); opacity: 0.8; }
      }
      
      /* Live Status Overlay */
      .status-overlay {
        position: fixed;
        bottom: 12px;
        right: 12px;
        padding: 0.6rem 1rem;
        background: rgba(0, 255, 255, 0.1);
        color: #0ff;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        border: 1px solid #0ff6;
        border-radius: 6px;
        box-shadow: 0 0 12px #0ff5;
        animation: glowPulse 2.4s infinite ease-in-out;
        z-index: 10000;
        backdrop-filter: blur(5px);
      }
      
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 12px #0ff5; }
        50% { box-shadow: 0 0 20px #0ff3; }
      }
      
      /* Hover effects */
      .health-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }
      
      .health-card.ok:hover {
        box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
      }
      
      .health-card.warning:hover {
        box-shadow: 0 4px 15px rgba(241, 196, 15, 0.3);
      }
      
      .health-card.fault:hover {
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
      }
      
      /* Critical severity styling */
      .health-card.critical {
        border-left: 5px solid #ff0033;
        background: linear-gradient(135deg, #1e1e1e 0%, #2a1a1a 100%);
      }
      
      .critical .pulse { 
        color: #ff0033;
        box-shadow: 0 0 10px #ff0033;
      }
      
      .health-card.critical:hover {
        box-shadow: 0 4px 15px rgba(255, 0, 51, 0.4);
      }
      
      /* Enhanced pulse animations */
      @keyframes pulse {
        0% { 
          transform: scale(1); 
          opacity: 0.8; 
          box-shadow: 0 0 5px currentColor;
        }
        50% { 
          transform: scale(1.6); 
          opacity: 0.3; 
          box-shadow: 0 0 15px currentColor;
        }
        100% { 
          transform: scale(1); 
          opacity: 0.8; 
          box-shadow: 0 0 5px currentColor;
        }
      }
      
      /* Critical flicker effect */
      @keyframes criticalFlicker {
        0% { 
          opacity: 0.2; 
          transform: scale(1);
          box-shadow: 0 0 8px #ff0033;
        }
        50% { 
          opacity: 0.8; 
          transform: scale(1.4);
          box-shadow: 0 0 20px #ff0033;
        }
        100% { 
          opacity: 0.2; 
          transform: scale(1);
          box-shadow: 0 0 8px #ff0033;
        }
      }
      
      /* AI Commentary Notification Animations */
      @keyframes aiSlideIn {
        from { 
          opacity: 0; 
          transform: translateX(100px) scale(0.9);
        }
        to { 
          opacity: 1; 
          transform: translateX(0) scale(1);
        }
      }
      
      @keyframes aiSlideOut {
        from { 
          opacity: 1; 
          transform: translateX(0) scale(1);
        }
        to { 
          opacity: 0; 
          transform: translateX(100px) scale(0.9);
        }
      }
      
      /* AI Avatar styling */
      .ai-avatar {
        font-size: 18px;
        flex-shrink: 0;
        animation: aiPulse 2s infinite;
      }
      
      @keyframes aiPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .ai-message {
        line-height: 1.4;
        font-weight: 500;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add live status overlay
    this.createLiveStatusOverlay();
  }

  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatModuleName(moduleName) {
    const nameMap = {
      'electronAPI': 'Electron API',
      'nodeAPI': 'Node API',
      'ipcConnection': 'IPC Connection',
      'memory': 'Memory Usage',
      'aiCopilot': 'AI Copilot',
      'pluginLoader': 'Plugin Loader',
      'uiManager': 'UI Manager',
      'ipcBridge': 'IPC Bridge'
    };
    return nameMap[moduleName] || moduleName;
  }

  getCategoryIcon(category) {
    const icons = {
      'C100': '✅',
      'W200': '⚠️',
      'E300': '❌',
      'F500': '🛑'
    };
    return icons[category] || '❓';
  }

  getCategoryName(category) {
    const names = {
      'C100': 'Critical Pass',
      'W200': 'Warning Only',
      'E300': 'Recoverable',
      'F500': 'Hard Failure'
    };
    return names[category] || category;
  }

  // Real-time data hookup methods
  getHealthCardClass(moduleStatus) {
    if (moduleStatus.ok) {
      return 'ok';
    } else if (moduleStatus.severity === 'low' || moduleStatus.severity === 'medium') {
      return 'warning';
    } else {
      return 'fault';
    }
  }

  getStatusEmoji(severity) {
    const emojiMap = {
      'low': '⚠️',
      'medium': '⚠️',
      'high': '❌',
      'critical': '🛑'
    };
    return emojiMap[severity] || '❓';
  }

  getStatusMessage(moduleStatus) {
    if (moduleStatus.ok) {
      return 'Operational';
    }
    
    const messages = {
      'low': 'Minor issues detected',
      'medium': 'Limited functionality',
      'high': 'Service degraded',
      'critical': 'Critical failure'
    };
    return messages[moduleStatus.severity] || 'Unknown status';
  }

  createLiveStatusOverlay() {
    // Remove existing overlay if it exists
    const existingOverlay = document.getElementById('dev-status-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'dev-status-overlay';
    overlay.className = 'status-overlay';
    
    // Update overlay content with real-time data
    this.updateLiveStatusOverlay(overlay);
    
    document.body.appendChild(overlay);
    
    // Update overlay every 3 seconds
    setInterval(() => {
      this.updateLiveStatusOverlay(overlay);
    }, 3000);
  }

  updateLiveStatusOverlay(overlay) {
    const status = getSystemStatusSnapshot();
    const aiStatus = status.modules.electronAPI?.ok ? 'OK' : '⚠️';
    const pluginStatus = status.modules.nodeAPI?.ok ? 'OK' : '⚠️';
    const uiStatus = status.modules.memory?.ok ? 'OK' : 'Partial';
    
    overlay.textContent = `🧠 AI: ${aiStatus} | 🔌 Plugin: ${pluginStatus} | 🎨 UI: ${uiStatus} Support`;
  }

  // Dynamic Pulse Animation System
  startPulseUpdates() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }
    
    this.pulseInterval = setInterval(() => {
      this.updatePulseUI();
    }, 3000); // Update pulse animations every 3 seconds
    
    console.log('🎵 Pulse animation system started');
  }

  stopPulseUpdates() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    
    console.log('🎵 Pulse animation system stopped');
  }

  updatePulseUI() {
    const status = getSystemStatusSnapshot();
    const cards = document.querySelectorAll('.health-card');
    
    cards.forEach(card => {
      const modNameElement = card.querySelector('h4');
      if (!modNameElement) return;
      
      const displayName = modNameElement.textContent.trim();
      const pulse = card.querySelector('.pulse');
      
      if (!pulse) return;
      
      // Map display name back to module key
      const moduleKey = this.getModuleKeyFromDisplayName(displayName);
      const modStatus = status.modules?.[moduleKey];
      
      if (!modStatus) return;
      
      // Remove existing severity classes
      card.classList.remove('ok', 'warning', 'fault', 'critical');
      
      if (modStatus.ok) {
        card.classList.add('ok');
        pulse.style.animationDuration = '1.8s';
        pulse.style.opacity = '1';
      } else if (modStatus.severity === 'low') {
        card.classList.add('warning');
        pulse.style.animationDuration = '1.2s';
        pulse.style.opacity = '0.7';
      } else if (modStatus.severity === 'medium') {
        card.classList.add('warning');
        pulse.style.animationDuration = '1.0s';
        pulse.style.opacity = '0.6';
      } else if (modStatus.severity === 'high') {
        card.classList.add('fault');
        pulse.style.animationDuration = '0.8s';
        pulse.style.opacity = '0.4';
      } else if (modStatus.severity === 'critical') {
        card.classList.add('critical');
        pulse.style.animationDuration = '0.5s';
        pulse.style.opacity = '0.2';
        // Add critical flicker effect
        pulse.style.animation = 'criticalFlicker 0.5s infinite alternate';
      }
    });
    
    // Check for critical issues and trigger AI commentary
    this.checkForCriticalIssues(status);
  }

  getModuleKeyFromDisplayName(displayName) {
    const nameMap = {
      'Electron API': 'electronAPI',
      'Node API': 'nodeAPI',
      'IPC Connection': 'ipcConnection',
      'Memory Usage': 'memory',
      'AI Copilot': 'aiCopilot',
      'Plugin Loader': 'pluginLoader',
      'UI Manager': 'uiManager',
      'IPC Bridge': 'ipcBridge'
    };
    return nameMap[displayName] || displayName.toLowerCase().replace(/\s+/g, '');
  }

  // AI Personality Response System
  checkForCriticalIssues(status) {
    const criticalModules = Object.entries(status.modules)
      .filter(([key, module]) => module.severity === 'critical' || module.severity === 'high')
      .map(([key, module]) => ({ key, ...module }));
    
    if (criticalModules.length > 0 && this.shouldTriggerAIResponse()) {
      this.triggerAICommentary(criticalModules, status);
    }
  }

  shouldTriggerAIResponse() {
    const now = Date.now();
    const lastResponse = this.lastAIResponse || 0;
    const cooldown = 30000; // 30 seconds cooldown
    
    return (now - lastResponse) > cooldown;
  }

  triggerAICommentary(criticalModules, status) {
    this.lastAIResponse = Date.now();
    
    const responses = this.generateAIResponses(criticalModules, status);
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Visual notification
    this.showAINotification(selectedResponse);
    
    // Voice synthesis (if available)
    if (window.speechSynthesis) {
      this.speakAIResponse(selectedResponse);
    }
    
    console.log('🧠 Rina AI Commentary:', selectedResponse);
  }

  generateAIResponses(criticalModules, status) {
    const moduleNames = criticalModules.map(m => this.formatModuleName(m.key));
    const responses = [];
    
    if (criticalModules.length === 1) {
      const module = moduleNames[0];
      responses.push(
        `${module} is experiencing critical issues. Initiating adaptive recovery protocols.`,
        `Heads up! ${module} needs attention. I'm working on stabilizing the system.`,
        `${module} is acting up again. Don't worry, I've got this under control.`,
        `Critical alert: ${module} is unstable. Running diagnostic sweep now.`
      );
    } else {
      responses.push(
        `Multiple systems are degraded: ${moduleNames.join(', ')}. Switching to emergency protocols.`,
        `Whoa! Several modules need help: ${moduleNames.join(', ')}. Time for some digital first aid.`,
        `System stress detected across ${moduleNames.join(', ')}. Deploying countermeasures.`,
        `Red alert! ${moduleNames.join(', ')} are all struggling. Initiating cascade recovery.`
      );
    }
    
    // Add personality-based responses
    if (status.overall.errorCount > 10) {
      responses.push(
        "That's a lot of errors! I'm like a digital paramedic right now.",
        "Error count is climbing fast. Time to put on my superhero cape!",
        "This is getting interesting. Challenge accepted!"
      );
    }
    
    return responses;
  }

  showAINotification(message) {
    const notification = document.createElement('div');
    notification.className = 'ai-commentary-notification';
    notification.innerHTML = `
      <div class="ai-avatar">🧠</div>
      <div class="ai-message">${message}</div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-size: 12px;
      max-width: 300px;
      z-index: 10002;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      animation: aiSlideIn 0.5s ease-out;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'aiSlideOut 0.5s ease-in';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);
  }

  speakAIResponse(message) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.7;
    
    // Try to use a more natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Samantha') || 
      voice.name.includes('Alex') || 
      voice.name.includes('Karen')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }

  startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      if (this.isRendered) {
        this.renderHealthPanel();
        this.updatePulseUI();
      }
    }, 5000); // Update every 5 seconds
    
    // Start pulse animation updates at higher frequency
    this.startPulseUpdates();
    
    console.log('🔄 Health panel real-time updates started');
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.stopPulseUpdates();
    
    console.log('⏹️ Health panel real-time updates stopped');
  }

  show() {
    this.renderHealthPanel();
    this.startRealTimeUpdates();
    console.log('📊 Health panel shown');
  }

  hide() {
    const panel = document.getElementById('dashboard-panel');
    if (panel) {
      panel.remove();
    }
    this.stopRealTimeUpdates();
    this.isRendered = false;
    console.log('📊 Health panel hidden');
  }

  toggle() {
    if (this.isRendered) {
      this.hide();
    } else {
      this.show();
    }
  }

  // Action handlers
  async runDiagnostics() {
    console.log('🧪 Running health panel diagnostics...');
    
    // Import and run diagnostics
    try {
      const { runPhase2Diagnostics } = await import('./phase2-debug-tools.js');
      runPhase2Diagnostics();
      
      // Show notification
      this.showNotification('Diagnostics completed', 'success');
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      this.showNotification('Diagnostics failed', 'error');
    }
  }

  clearErrors() {
    console.log('🗑️ Clearing error history...');
    
    // Clear error triage system errors
    if (window.ErrorTriageSystem) {
      window.ErrorTriageSystem.errors.clear();
    }
    
    // Clear dashboard errors
    if (window.errorTriageDashboard) {
      window.errorTriageDashboard.clearHistory();
    }
    
    this.showNotification('Error history cleared', 'success');
    this.renderHealthPanel(); // Refresh display
  }

  exportReport() {
    console.log('📥 Exporting health report...');
    
    const status = getSystemStatusSnapshot();
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth: status,
      generatedBy: 'RinaWarp Terminal Health Panel',
      version: '2.0.0'
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Health report exported', 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `health-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// Create global instance
const phase2HealthPanel = new Phase2HealthPanel();

// Add keyboard shortcut
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'H') {
    phase2HealthPanel.toggle();
  }
});

// Export for global use
if (typeof window !== 'undefined') {
  window.phase2HealthPanel = phase2HealthPanel;
}

export default phase2HealthPanel;
