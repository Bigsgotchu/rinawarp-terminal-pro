/**
 * Car Dashboard Theme for RinaWarp Terminal
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * A terminal theme inspired by modern car dashboards with:
 * - Speedometer-style gauges for system metrics
 * - Odometer display for command history/uptime
 * - RPM gauge for CPU usage
 * - Fuel gauge for disk space
 * - Temperature gauge for system temps
 * - Dashboard-inspired color scheme
 */

export class CarDashboardTheme {
  constructor() {
    this.theme = {
      id: 'car-dashboard',
      name: '🚗 Car Dashboard',
      description: 'Modern automotive dashboard with gauges and car-inspired metrics',
      category: 'Automotive',

      // Color scheme inspired by luxury car interiors
      colors: {
        // Dashboard background - dark leather/carbon fiber
        background: '#0a0a0a',
        foreground: '#e0e0e0',

        // Accent colors - automotive lighting
        cursor: '#ff6b35', // Amber dashboard light
        selection: 'rgba(255, 107, 53, 0.3)',

        // Terminal colors inspired by car electronics
        black: '#000000',
        red: '#ff3333', // Warning lights
        green: '#00ff55', // Ready/OK status
        yellow: '#ffaa00', // Caution/check engine
        blue: '#3399ff', // Information display
        magenta: '#ff33aa', // Sport/performance mode
        cyan: '#00ffff', // Coolant/AC blue
        white: '#ffffff',

        // Bright variants for high-intensity displays
        brightBlack: '#333333',
        brightRed: '#ff6666',
        brightGreen: '#66ff88',
        brightYellow: '#ffcc33',
        brightBlue: '#66aaff',
        brightMagenta: '#ff66cc',
        brightCyan: '#66ffff',
        brightWhite: '#ffffff',
      },

      ui: {
        // Dashboard-inspired UI colors
        headerBg: '#1a1a1a', // Dashboard top panel
        tabBg: '#262626', // Instrument cluster background
        tabActiveBg: '#0a0a0a', // Active gauge/display
        statusBg: '#1a1a1a', // Status bar like car info display
        borderColor: '#ff6b35', // Amber accent like dashboard trim
        accentColor: '#ff6b35', // Primary amber accent

        // Additional car-specific colors
        speedometerColor: '#00ff55', // Green like speedometer
        rpmColor: '#ff3333', // Red like RPM gauge
        fuelColor: '#ffaa00', // Yellow/amber like fuel gauge
        tempColor: '#3399ff', // Blue like temperature gauge
        odometerColor: '#e0e0e0', // White like odometer digits

        // Warning colors
        warningAmber: '#ffaa00',
        warningRed: '#ff3333',
        okGreen: '#00ff55',
        infoBlue: '#3399ff',
      },

      // Custom gauge configurations
      gauges: {
        speedometer: {
          label: 'Network Speed',
          unit: 'Mbps',
          max: 1000,
          color: '#00ff55',
          warningThreshold: 800,
          criticalThreshold: 950,
        },
        rpm: {
          label: 'CPU Usage',
          unit: '%',
          max: 100,
          color: '#ff3333',
          warningThreshold: 70,
          criticalThreshold: 90,
        },
        fuel: {
          label: 'Disk Space',
          unit: '%',
          max: 100,
          color: '#ffaa00',
          warningThreshold: 80,
          criticalThreshold: 95,
        },
        temperature: {
          label: 'System Temp',
          unit: '°C',
          max: 100,
          color: '#3399ff',
          warningThreshold: 75,
          criticalThreshold: 85,
        },
      },

      // Odometer configuration
      odometer: {
        totalCommands: 0,
        uptime: '00:00:00',
        sessionMiles: 0,
        totalMiles: 0,
      },
    };

    this.gaugeElements = new Map();
    this.odometerElement = null;
    this.metricsInterval = null;
    this.startTime = Date.now();
    this.commandCount = 0;
  }

  apply() {
    // Apply base theme colors
    this.applyThemeToDOM();

    // Create and inject custom dashboard CSS
    this.injectDashboardCSS();

    // Create automotive UI elements
    this.createDashboardHeader();
    this.createGauges();
    this.createOdometer();

    // Start metrics monitoring
    this.startMetricsMonitoring();

    // Apply to terminal if available
    if (window.term) {
      this.applyThemeToTerminal();
    }

    console.log('🚗 Car Dashboard theme applied!');
  }

  applyThemeToDOM() {
    const root = document.documentElement;

    // Apply data attribute
    root.setAttribute('data-theme', this.theme.id);

    // Apply colors as CSS variables
    Object.entries(this.theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-color-${key}`, value);
    });

    // Apply UI colors
    Object.entries(this.theme.ui).forEach(([key, value]) => {
      root.style.setProperty(`--ui-${key}`, value);
    });

    // Update body background
    document.body.style.backgroundColor = this.theme.colors.background;
  }

  injectDashboardCSS() {
    const style = document.createElement('style');
    style.id = 'car-dashboard-theme-styles';

    style.textContent = `
      /* Car Dashboard Theme Styles - Sidebar positioning */
      .car-dashboard-sidebar {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 280px;
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        border: 2px solid var(--ui-borderColor);
        border-radius: 10px;
        padding: 15px;
        font-family: 'Arial', sans-serif;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
        z-index: 100;
        opacity: 0.9;
        transition: opacity 0.3s ease;
      }
      
      .car-dashboard-sidebar:hover {
        opacity: 1;
      }
      
      .dashboard-logo {
        color: var(--ui-accentColor);
        font-weight: bold;
        font-size: 18px;
        text-shadow: 0 0 10px currentColor;
      }
      
      .dashboard-gauges {
        display: flex;
        gap: 15px;
        align-items: center;
      }
      
      .gauge {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, #000 30%, #1a1a1a 70%);
        border: 3px solid #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .gauge:hover {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
      }
      
      .gauge-value {
        font-weight: bold;
        font-size: 12px;
        color: #fff;
        line-height: 1;
      }
      
      .gauge-label {
        font-size: 8px;
        color: #aaa;
        margin-top: 2px;
      }
      
      .gauge-needle {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 2px;
        height: 20px;
        background: var(--gauge-color, #fff);
        transform-origin: bottom center;
        transform: translate(-50%, -100%) rotate(var(--needle-angle, 0deg));
        box-shadow: 0 0 5px currentColor;
      }
      
      .gauge-arc {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: var(--gauge-color, #fff);
        opacity: 0.3;
        transform: rotate(-90deg);
      }
      
      .gauge.warning {
        border-color: var(--ui-warningAmber);
        animation: pulse-warning 2s infinite;
      }
      
      .gauge.critical {
        border-color: var(--ui-warningRed);
        animation: pulse-critical 1s infinite;
      }
      
      @keyframes pulse-warning {
        0%, 100% { box-shadow: 0 0 10px rgba(255, 170, 0, 0.5); }
        50% { box-shadow: 0 0 20px rgba(255, 170, 0, 0.8); }
      }
      
      @keyframes pulse-critical {
        0%, 100% { box-shadow: 0 0 15px rgba(255, 51, 51, 0.7); }
        50% { box-shadow: 0 0 30px rgba(255, 51, 51, 1); }
      }
      
      .odometer-container {
        background: linear-gradient(45deg, #000 0%, #1a1a1a 100%);
        border: 2px solid var(--ui-borderColor);
        border-radius: 8px;
        padding: 8px 12px;
        font-family: 'Courier New', monospace;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 120px;
      }
      
      .odometer-display {
        font-size: 14px;
        font-weight: bold;
        color: var(--ui-odometerColor);
        text-shadow: 0 0 5px currentColor;
        letter-spacing: 1px;
      }
      
      .odometer-label {
        font-size: 8px;
        color: #888;
        text-transform: uppercase;
        margin-top: 2px;
      }
      
      .session-info {
        display: flex;
        gap: 10px;
        font-size: 10px;
        color: #aaa;
        margin-top: 4px;
      }
      
      .info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .info-value {
        color: var(--ui-infoBlue);
        font-weight: bold;
      }
      
      /* Terminal customizations for car theme - No padding needed for sidebar */
      .xterm-viewport {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%) !important;
      }
      
      .xterm-screen {
        background: transparent !important;
      }
      
      /* Ensure terminal uses full available space */
      .terminal-container, .xterm {
        padding-right: 300px; /* Space for sidebar */
      }
      
      /* Custom scrollbar that looks like car interior trim */
      .xterm-viewport::-webkit-scrollbar {
        width: 8px;
      }
      
      .xterm-viewport::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
      }
      
      .xterm-viewport::-webkit-scrollbar-thumb {
        background: linear-gradient(45deg, var(--ui-accentColor), #cc5529);
        border-radius: 4px;
        box-shadow: 0 0 5px rgba(255, 107, 53, 0.3);
      }
      
      .xterm-viewport::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(45deg, #ff8c5a, var(--ui-accentColor));
      }
      
      /* Car-style status indicators */
      .car-status-indicators {
        position: fixed;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        z-index: 1000;
      }
      
      .status-light {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 1px solid #333;
        box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
      }
      
      .status-light.engine { background: var(--ui-okGreen); }
      .status-light.oil { background: var(--ui-warningAmber); }
      .status-light.battery { background: var(--ui-warningRed); }
      .status-light.signal { background: var(--ui-infoBlue); }
      
      .status-light.active {
        box-shadow: 0 0 10px currentColor;
        animation: blink 2s infinite;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    `;

    document.head.appendChild(style);
  }

  createDashboardHeader() {
    // Remove existing header if present
    const existingHeader = document.getElementById('car-dashboard-header');
    if (existingHeader) {
      existingHeader.remove();
    }

    const header = document.createElement('div');
    header.id = 'car-dashboard-header';
    header.className = 'car-dashboard-sidebar';

    header.innerHTML = `
      <div class="dashboard-logo">🚗 RINAWARP TERMINAL</div>
      <div class="dashboard-gauges" id="dashboard-gauges"></div>
      <div class="odometer-container" id="odometer-container">
        <div class="odometer-display" id="odometer-display">000000</div>
        <div class="odometer-label">Total Commands</div>
        <div class="session-info">
          <div class="info-item">
            <div class="info-value" id="uptime">00:00:00</div>
            <div>Uptime</div>
          </div>
          <div class="info-item">
            <div class="info-value" id="session-commands">0</div>
            <div>Session</div>
          </div>
        </div>
      </div>
    `;

    // Insert at the beginning of body
    document.body.insertBefore(header, document.body.firstChild);

    // Add status indicators
    this.createStatusIndicators();
  }

  createStatusIndicators() {
    const indicators = document.createElement('div');
    indicators.className = 'car-status-indicators';
    indicators.innerHTML = `
      <div class="status-light engine active" title="System Online"></div>
      <div class="status-light oil" title="CPU Status"></div>
      <div class="status-light battery" title="Memory Status"></div>
      <div class="status-light signal" title="Network Status"></div>
    `;
    document.body.appendChild(indicators);
  }

  createGauges() {
    const gaugesContainer = document.getElementById('dashboard-gauges');
    if (!gaugesContainer) return;

    Object.entries(this.theme.gauges).forEach(([key, config]) => {
      const gauge = this.createSingleGauge(key, config);
      gaugesContainer.appendChild(gauge);
      this.gaugeElements.set(key, gauge);
    });
  }

  createSingleGauge(key, config) {
    const gauge = document.createElement('div');
    gauge.className = 'gauge';
    gauge.style.setProperty('--gauge-color', config.color);
    gauge.title = `${config.label}: Click for details`;

    gauge.innerHTML = `
      <div class="gauge-arc"></div>
      <div class="gauge-needle"></div>
      <div class="gauge-value" id="gauge-${key}-value">0</div>
      <div class="gauge-label">${config.label}</div>
    `;

    // Add click handler for gauge details
    gauge.addEventListener('click', () => {
      this.showGaugeDetails(key, config);
    });

    return gauge;
  }

  createOdometer() {
    this.odometerElement = document.getElementById('odometer-container');
    // Load stored values
    this.loadOdometerData();
  }

  startMetricsMonitoring() {
    // Clear existing interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Update metrics every 2 seconds
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 2000);

    // Also track terminal commands
    this.trackTerminalCommands();
  }

  updateMetrics() {
    // Simulate car-like metrics (in a real implementation, these would come from actual system metrics)
    const metrics = {
      speedometer: Math.random() * 100, // Network speed simulation
      rpm: Math.random() * 100, // CPU usage simulation
      fuel: 85 - Math.random() * 20, // Disk space simulation
      temperature: 35 + Math.random() * 30, // System temperature simulation
    };

    Object.entries(metrics).forEach(([key, value]) => {
      this.updateGauge(key, value);
    });

    this.updateOdometer();
    this.updateStatusLights(metrics);
  }

  updateGauge(key, value) {
    const gauge = this.gaugeElements.get(key);
    const config = this.theme.gauges[key];

    if (!gauge || !config) return;

    const valueElement = gauge.querySelector(`#gauge-${key}-value`);
    const needle = gauge.querySelector('.gauge-needle');

    // Update value display
    valueElement.textContent = Math.round(value);

    // Calculate needle angle (0-180 degrees for half circle)
    const angle = (value / config.max) * 180 - 90;
    needle.style.setProperty('--needle-angle', `${angle}deg`);

    // Update gauge status classes
    gauge.classList.remove('warning', 'critical');
    if (value >= config.criticalThreshold) {
      gauge.classList.add('critical');
    } else if (value >= config.warningThreshold) {
      gauge.classList.add('warning');
    }
  }

  updateOdometer() {
    const uptimeElement = document.getElementById('uptime');
    const sessionElement = document.getElementById('session-commands');
    const totalElement = document.getElementById('odometer-display');

    // Calculate uptime
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    uptimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    sessionElement.textContent = this.commandCount;

    // Update total commands (odometer style)
    const totalCommands = this.loadTotalCommands() + this.commandCount;
    totalElement.textContent = totalCommands.toString().padStart(6, '0');
  }

  updateStatusLights(metrics) {
    const lights = document.querySelectorAll('.status-light');

    // Engine light (always on for system online)
    lights[0].classList.add('active');

    // Oil light (CPU warning)
    if (metrics.rpm > 70) {
      lights[1].classList.add('active');
    } else {
      lights[1].classList.remove('active');
    }

    // Battery light (Memory warning - simulated)
    if (Math.random() > 0.8) {
      lights[2].classList.add('active');
    } else {
      lights[2].classList.remove('active');
    }

    // Signal light (Network activity - simulated)
    if (metrics.speedometer > 50) {
      lights[3].classList.add('active');
    } else {
      lights[3].classList.remove('active');
    }
  }

  trackTerminalCommands() {
    // Hook into terminal command execution
    if (window.term) {
      const originalWrite = window.term.write;
      window.term.write = data => {
        // Detect command execution (simple heuristic)
        if (typeof data === 'string' && data.includes('\n') && !data.startsWith(' ')) {
          this.commandCount++;
        }
        return originalWrite.call(window.term, data);
      };
    }

    // Alternative: Listen for keyboard events that might indicate commands
    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.closest('.xterm-screen')) {
        this.commandCount++;
      }
    });
  }

  showGaugeDetails(key, config) {
    // Create a modal or tooltip with detailed gauge information
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border: 2px solid ${config.color};
      border-radius: 10px;
      padding: 20px;
      z-index: 10000;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 0 20px rgba(0,0,0,0.8);
    `;

    modal.innerHTML = `
      <h3 style="margin-top: 0; color: ${config.color};">${config.label} Details</h3>
      <p><strong>Maximum:</strong> ${config.max} ${config.unit}</p>
      <p><strong>Warning Level:</strong> ${config.warningThreshold} ${config.unit}</p>
      <p><strong>Critical Level:</strong> ${config.criticalThreshold} ${config.unit}</p>
      <p><strong>Current Value:</strong> <span id="modal-current-value">--</span> ${config.unit}</p>
      <button onclick="this.parentElement.remove()" style="
        background: ${config.color};
        color: #000;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
      ">Close</button>
    `;

    document.body.appendChild(modal);

    // Remove modal after 5 seconds
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 5000);
  }

  applyThemeToTerminal() {
    if (!window.term) return;

    const termTheme = {
      background: this.theme.colors.background,
      foreground: this.theme.colors.foreground,
      cursor: this.theme.colors.cursor,
      cursorAccent: this.theme.colors.background,
      selection: this.theme.colors.selection,
      black: this.theme.colors.black,
      red: this.theme.colors.red,
      green: this.theme.colors.green,
      yellow: this.theme.colors.yellow,
      blue: this.theme.colors.blue,
      magenta: this.theme.colors.magenta,
      cyan: this.theme.colors.cyan,
      white: this.theme.colors.white,
      brightBlack: this.theme.colors.brightBlack,
      brightRed: this.theme.colors.brightRed,
      brightGreen: this.theme.colors.brightGreen,
      brightYellow: this.theme.colors.brightYellow,
      brightBlue: this.theme.colors.brightBlue,
      brightMagenta: this.theme.colors.brightMagenta,
      brightCyan: this.theme.colors.brightCyan,
      brightWhite: this.theme.colors.brightWhite,
    };

    window.term.options.theme = termTheme;
  }

  loadOdometerData() {
    try {
      const stored = localStorage.getItem('rinawarp-car-theme-odometer');
      if (stored) {
        const data = JSON.parse(stored);
        this.theme.odometer = { ...this.theme.odometer, ...data };
      }
    } catch (error) {
      console.log('Could not load odometer data');
    }
  }

  saveOdometerData() {
    try {
      const data = {
        ...this.theme.odometer,
        totalCommands: this.loadTotalCommands() + this.commandCount,
      };
      localStorage.setItem('rinawarp-car-theme-odometer', JSON.stringify(data));
    } catch (error) {
      console.log('Could not save odometer data');
    }
  }

  loadTotalCommands() {
    try {
      const stored = localStorage.getItem('rinawarp-car-theme-total-commands');
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  cleanup() {
    // Clean up intervals and event listeners
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Save odometer data
    this.saveOdometerData();

    // Remove custom elements
    const header = document.getElementById('car-dashboard-header');
    if (header) header.remove();

    const indicators = document.querySelector('.car-status-indicators');
    if (indicators) indicators.remove();

    const styles = document.getElementById('car-dashboard-theme-styles');
    if (styles) styles.remove();
  }
}

// Export for use in other modules
export default CarDashboardTheme;
