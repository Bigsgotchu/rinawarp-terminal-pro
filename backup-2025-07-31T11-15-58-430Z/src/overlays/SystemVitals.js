/**
 * RinaWarp Terminal - SystemVitals Live Dashboard Module
 * Visual overlay component with triage categories and animated pulse rings
 *
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const triageCategories = [
  { code: 'C100', icon: '✅', color: '#00ff00', name: 'Operational' },
  { code: 'W200', icon: '⚠️', color: '#ffff00', name: 'Recoverable' },
  { code: 'E300', icon: '❌', color: '#ff8800', name: 'Recoverable' },
  { code: 'F500', icon: '🔥', color: '#ff0000', name: 'Critical' },
];

const coreModules = ['electronAPI', 'ipcBridge', 'pluginLoader'];

class SystemVitals {
  constructor(container) {
    this.container = container;
    this.events = [];
    this.moduleStatus = new Map();
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.createHTML();
    this.setupEventListeners();
    this.startAnimations();
    this.connectToTriageSystem();
  }

  createHTML() {
    this.container.innerHTML = `
      <div class="system-vitals" style="
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #00ff88;
        border-radius: 12px;
        padding: 20px;
        color: #ffffff;
        font-family: 'Courier New', monospace;
        z-index: 1000;
        backdrop-filter: blur(10px);
      ">
        <div class="header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <h2 style="
            margin: 0;
            color: #00ff88;
            font-size: 1.2em;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
          ">🖥️ System Vitals</h2>
          <button id="vitals-toggle" style="
            background: transparent;
            border: 1px solid #00ff88;
            color: #00ff88;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
          ">−</button>
        </div>

        <div id="vitals-content">
          <div class="triage-categories" style="
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
          ">
            ${triageCategories
              .map(
                category => `
              <span class="triage-badge" data-code="${category.code}" style="
                color: ${category.color};
                background: rgba(${this.hexToRgb(category.color)}, 0.2);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                border: 1px solid ${category.color};
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span class="badge-icon">${category.icon}</span>
                <span class="badge-name">${category.code}</span>
                <span class="badge-count">0</span>
              </span>
            `
              )
              .join('')}
          </div>

          <div class="core-modules" style="
            display: flex;
            gap: 15px;
            justify-content: space-around;
            margin-bottom: 15px;
          ">
            ${coreModules
              .map(
                module => `
              <div class="module-container" data-module="${module}" style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
              ">
                <svg class="pulse-ring" width="60" height="60" style="overflow: visible;">
                  <circle class="pulse-circle" cx="30" cy="30" r="25" 
                    stroke="#00ff88" stroke-width="2" fill="none" opacity="0.8"/>
                  <circle class="pulse-ring-1" cx="30" cy="30" r="25" 
                    stroke="#00ff88" stroke-width="1" fill="none" opacity="0"/>
                  <circle class="pulse-ring-2" cx="30" cy="30" r="25" 
                    stroke="#00ff88" stroke-width="1" fill="none" opacity="0"/>
                </svg>
                <span class="module-name" style="
                  font-size: 0.7em;
                  color: #cccccc;
                  text-align: center;
                  max-width: 60px;
                  word-wrap: break-word;
                ">${module}</span>
                <div class="module-status" style="
                  font-size: 0.6em;
                  color: #00ff88;
                  text-align: center;
                ">●</div>
              </div>
            `
              )
              .join('')}
          </div>

          <div class="event-log" style="
            max-height: 150px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
            padding: 10px;
          ">
            <h3 style="
              margin: 0 0 10px 0;
              font-size: 0.9em;
              color: #00ff88;
            ">Recent Events</h3>
            <div id="event-list" style="
              font-size: 0.7em;
              color: #cccccc;
            "></div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const toggleBtn = this.container.querySelector('#vitals-toggle');
    const content = this.container.querySelector('#vitals-content');

    toggleBtn.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? '+' : '−';
    });
  }

  startAnimations() {
    // Start pulse animations for core modules
    coreModules.forEach((module, index) => {
      const container = this.container.querySelector(`[data-module="${module}"]`);
      if (container) {
        this.animateModule(container, index * 0.5);
      }
    });
  }

  animateModule(container, delay = 0) {
    const rings = container.querySelectorAll('.pulse-ring-1, .pulse-ring-2');
    const baseCircle = container.querySelector('.pulse-circle');

    const startTime = Date.now() + delay * 1000;

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = (elapsed % 2) / 2; // 2-second cycle

      // Update module status color based on health
      const moduleName = container.getAttribute('data-module');
      const isHealthy = this.checkModuleHealth(moduleName);
      const statusColor = isHealthy ? '#00ff88' : '#ff4757';

      baseCircle.setAttribute('stroke', statusColor);

      rings.forEach((ring, index) => {
        const ringProgress = (progress + index * 0.3) % 1;
        const opacity = Math.max(0, 1 - ringProgress);
        const radius = 25 + ringProgress * 15;

        ring.setAttribute('r', radius);
        ring.setAttribute('opacity', opacity * 0.6);
        ring.setAttribute('stroke', statusColor);
      });

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  checkModuleHealth(moduleName) {
    switch (moduleName) {
      case 'electronAPI':
        return !!window.electronAPI;
      case 'ipcBridge':
        return !!(window.electronAPI && window.nodeAPI);
      case 'pluginLoader':
        return !!(window.pluginLoader && window.pluginLoader.isInitialized);
      default:
        return true;
    }
  }

  connectToTriageSystem() {
    if (window.ErrorTriageSystem) {
      // Monitor for triage events
      const originalReportError = window.ErrorTriageSystem.reportError;
      window.ErrorTriageSystem.reportError = async (...args) => {
        const result = await originalReportError.apply(window.ErrorTriageSystem, args);
        this.handleTriageEvent(result);
        return result;
      };

      // Initial health check
      this.updateSystemStatus();
      setInterval(() => this.updateSystemStatus(), 5000);
    }
  }

  handleTriageEvent(event) {
    // Add to events list
    this.events.unshift({
      ...event,
      timestamp: Date.now(),
      message: event.resolution || 'System event',
    });

    // Keep only last 10 events
    this.events = this.events.slice(0, 10);

    // Update triage badge counts
    this.updateTriageBadges();

    // Update event log
    this.updateEventLog();
  }

  updateTriageBadges() {
    const counts = {};
    triageCategories.forEach(cat => (counts[cat.code] = 0));

    // Count recent events (last 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.events.forEach(event => {
      if (event.timestamp > dayAgo && counts[event.category] !== undefined) {
        counts[event.category]++;
      }
    });

    // Update badge displays
    Object.entries(counts).forEach(([code, count]) => {
      const badge = this.container.querySelector(`[data-code="${code}"] .badge-count`);
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    });
  }

  updateEventLog() {
    const eventList = this.container.querySelector('#event-list');
    if (!eventList) return;

    const eventsHTML = this.events
      .slice(0, 5)
      .map(event => {
        const category = triageCategories.find(cat => cat.code === event.category);
        const icon = category ? category.icon : '•';
        const time = new Date(event.timestamp).toLocaleTimeString();

        return `
        <div style="
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <span>${icon} ${event.category || 'N/A'}</span>
          <span style="color: #666; font-size: 0.6em;">${time}</span>
        </div>
      `;
      })
      .join('');

    eventList.innerHTML = eventsHTML || '<div style="color: #666;">No recent events</div>';
  }

  updateSystemStatus() {
    // Update module statuses
    coreModules.forEach(module => {
      const container = this.container.querySelector(`[data-module="${module}"]`);
      const statusDiv = container?.querySelector('.module-status');

      if (statusDiv) {
        const isHealthy = this.checkModuleHealth(module);
        statusDiv.style.color = isHealthy ? '#00ff88' : '#ff4757';
        statusDiv.textContent = isHealthy ? '●' : '×';
      }
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '255, 255, 255';
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.container.innerHTML = '';
  }
}

// Auto-initialize if container exists
if (typeof window !== 'undefined') {
  window.SystemVitals = SystemVitals;

  // Auto-create if container exists
  document.addEventListener('DOMContentLoaded', () => {
    let container = document.getElementById('system-vitals-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'system-vitals-root';
      document.body.appendChild(container);
    }

    if (container) {
      window.systemVitals = new SystemVitals(container);
    }
  });
}

export default SystemVitals;
