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
      console.log('🚗 Starting Car Dashboard Theme activation...');

      // Initialize theme manager
      this.themeManager = getThemeManager();

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('⚠️  Car Dashboard Theme requires a browser environment');
        console.log('   Please run this in your RinaWarp terminal application');
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
      console.log('');
      console.log('🎛️  Dashboard Features:');
      console.log('   • Speedometer gauge (Network Speed)');
      console.log('   • RPM gauge (CPU Usage)');
      console.log('   • Fuel gauge (Disk Space)');
      console.log('   • Temperature gauge (System Temp)');
      console.log('   • Odometer (Command Counter)');
      console.log('   • Status lights (System indicators)');
      console.log('');
      console.log('📊 Click on any gauge for detailed information');
      console.log('⏱️  Metrics update every 2 seconds');
      console.log('💾 Your command history is preserved between sessions');
      console.log('');
      console.log('To deactivate, run: node deactivate-car-theme.js');

      return true;
    } catch (error) {
      console.error('❌ Failed to activate Car Dashboard Theme:', error.message);
      return false;
    }
  }

  async deactivate() {
    try {
      console.log('🚗 Deactivating Car Dashboard Theme...');

      if (this.carTheme && this.isActive) {
        this.carTheme.cleanup();
      }

      // Switch back to default theme
      if (this.themeManager) {
        this.themeManager.applyTheme('mermaid-depths');
      }

      this.isActive = false;

      console.log('✅ Car Dashboard Theme deactivated');
      console.log('   Switched back to Mermaid Depths theme');

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

  showHelp() {
    console.log('🚗 Car Dashboard Theme - Command Line Interface');
    console.log('');
    console.log('Usage:');
    console.log('  node activate-car-theme.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  activate    Activate the car dashboard theme (default)');
    console.log('  deactivate  Deactivate and return to default theme');
    console.log('  status      Show current theme status');
    console.log('  help        Show this help message');
    console.log('');
    console.log('Features:');
    console.log('  🏎️  Automotive-inspired color scheme');
    console.log('  📊 Real-time system metrics gauges');
    console.log('  🔢 Command counter odometer');
    console.log('  ⚠️  Status indicator lights');
    console.log('  ⏱️  Session uptime tracking');
    console.log('');
    console.log('Examples:');
    console.log('  node activate-car-theme.js');
    console.log('  node activate-car-theme.js activate');
    console.log('  node activate-car-theme.js status');
  }
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
    const status = carThemeActivator.getStatus();
    console.log('🚗 Car Dashboard Theme Status:');
    console.log(`   Active: ${status.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   Gauges: ${status.hasGauges ? '✅ Running' : '❌ Not running'}`);
    console.log(`   Odometer: ${status.hasOdometer ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`   Commands: ${status.commandCount}`);
    console.log(`   Uptime: ${Math.floor(status.uptime / 1000)}s`);
    break;

  case 'help':
  case '--help':
  case '-h':
    carThemeActivator.showHelp();
    break;

  default:
    console.log(`❌ Unknown command: ${command}`);
    console.log('Use "help" to see available commands');
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
