#!/usr/bin/env node

/**
 * Car Dashboard Theme Activator for RinaWarp Terminal
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This script activates the car dashboard theme with all its special features:
 * - Speedometer-style gauges
 * - Odometer display
 * - Car-style status lights
 * - Automotive color scheme
 * - Real-time system metrics
 */

import { CarDashboardTheme } from './src/themes/car-dashboard-theme.js';
import { getThemeManager } from './src/themes/unified-theme-manager.js';

class CarThemeActivator {
  constructor() {
    this.carTheme = null;
    this.themeManager = null;
    this.isActive = false;
  }

  async activate() {
    try {
      // Initialize theme manager
      this.themeManager = getThemeManager();

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return false;
      }

      // Create and apply the car dashboard theme
      this.carTheme = new CarDashboardTheme();

      // Set the theme in the unified manager
      this.themeManager.applyTheme('car-dashboard');

      // Apply the custom car dashboard features
      this.carTheme.apply();

      // Mark as active
      this.isActive = true;

      console.log('✅ Car Dashboard Theme activated successfully!');
      console.log('📊 Click on any gauge for detailed information');

      return true;
    } catch (error) {
      console.error('❌ Failed to activate Car Dashboard Theme:', error.message);
      return false;
    }
  }

  async deactivate() {
    try {
      if (this.carTheme && this.isActive) {
        this.carTheme.cleanup();
      }

      // Switch back to default theme
      if (this.themeManager) {
        this.themeManager.applyTheme('mermaid-depths');
      }

      this.isActive = false;

      console.log('✅ Car Dashboard Theme deactivated');

      return true;
    } catch (error) {
      console.error('❌ Failed to deactivate Car Dashboard Theme:', error.message);
      return false;
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      hasGauges: this.carTheme ? this.carTheme.gaugeElements.size > 0 : false,
      hasOdometer: this.carTheme ? !!this.carTheme.odometerElement : false,
      commandCount: this.carTheme ? this.carTheme.commandCount : 0,
      uptime: this.carTheme ? Date.now() - this.carTheme.startTime : 0,
    };
  }

  showHelp() {}
}

// Create global instance
const carThemeActivator = new CarThemeActivator();

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'activate';

async function main() {
  switch (command) {
    case 'activate':
      await carThemeActivator.activate();
      break;

    case 'deactivate':
      await carThemeActivator.deactivate();
      break;

    case 'status':
      const _status = carThemeActivator.getStatus();
      break;

    case 'help':
    case '--help':
    case '-h':
      carThemeActivator.showHelp();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

// Export for use as module
export { CarThemeActivator, carThemeActivator };
export default carThemeActivator;
