/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Auto-Updater Module for RinaWarp Terminal
 * Handles automatic updates with user notifications
 */

import { autoUpdater } from 'electron-updater';
import { dialog, _BrowserWindow, ipcMain } from 'electron';
import logger from '../utilities/logger.js';

class AutoUpdaterManager {
  constructor() {
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.mainWindow = null;

    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set update feed URL
    if (process.env.UPDATE_FEED_URL) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: process.env.UPDATE_FEED_URL,
      });
    }

    this.setupEventHandlers();
    this.setupIpcHandlers();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupEventHandlers() {
    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...');
      this.sendStatusToWindow('checking-for-update');
    });

    // Update available
    autoUpdater.on('update-available', info => {
      logger.info('Update available:', info);
      this.updateAvailable = true;
      this.sendStatusToWindow('update-available', info);

      // Show dialog to user
      this.showUpdateAvailableDialog(info);
    });

    // No update available
    autoUpdater.on('update-not-available', info => {
      logger.info('Update not available');
      this.sendStatusToWindow('update-not-available', info);
    });

    // Error occurred
    autoUpdater.on('error', err => {
      logger.error('Error in auto-updater:', err);
      this.sendStatusToWindow('error', err.message);
    });

    // Download progress
    autoUpdater.on('download-progress', progressObj => {
      let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
      logMessage += ` - Downloaded ${progressObj.percent.toFixed(2)}%`;
      logMessage += ` (${progressObj.transferred}/${progressObj.total})`;

      logger.info(logMessage);
      this.sendStatusToWindow('download-progress', progressObj);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', info => {
      logger.info('Update downloaded:', info);
      this.updateDownloaded = true;
      this.sendStatusToWindow('update-downloaded', info);

      // Show dialog to user
      this.showUpdateReadyDialog(info);
    });
  }

  setupIpcHandlers() {
    // Check for updates manually
    ipcMain.handle('check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return {
          updateAvailable: result.updateInfo ? true : false,
          version: result.updateInfo?.version,
          releaseDate: result.updateInfo?.releaseDate,
        };
      } catch (error) {
        logger.error('Failed to check for updates:', error);
        throw new Error(new Error(error));
      }
    });

    // Download update
    ipcMain.handle('download-update', async () => {
      if (this.updateAvailable && !this.updateDownloaded) {
        autoUpdater.downloadUpdate();
        return true;
      }
      return false;
    });

    // Install update
    ipcMain.handle('install-update', () => {
      if (this.updateDownloaded) {
        autoUpdater.quitAndInstall();
        return true;
      }
      return false;
    });

    // Get update status
    ipcMain.handle('get-update-status', () => {
      return {
        checking: false,
        updateAvailable: this.updateAvailable,
        updateDownloaded: this.updateDownloaded,
      };
    });
  }

  sendStatusToWindow(event, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(`updater-${event}`, data);
    }
  }

  async showUpdateAvailableDialog(info) {
    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version ${info.version} is available. Would you like to download it now?`,
      detail: `Release Date: ${new Date(info.releaseDate).toLocaleDateString()}\n\nCurrent version: ${autoUpdater.currentVersion}`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      autoUpdater.downloadUpdate();
    }
  }

  async showUpdateReadyDialog(info) {
    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart now to apply the update?`,
      detail: 'The application will restart to complete the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall();
    }
  }

  // Check for updates on startup
  async checkForUpdatesOnStartup() {
    // Wait a bit before checking to let the app fully load
    setTimeout(() => {
      if (process.env.ENABLE_AUTO_UPDATES === 'true') {
        autoUpdater.checkForUpdates().catch(err => {
          logger.error('Failed to check for updates on startup:', err);
        });
      }
    }, 10000); // 10 seconds
  }

  // Enable/disable auto updates
  setAutoDownload(enabled) {
    autoUpdater.autoDownload = enabled;
  }

  // Force check for updates
  async forceCheck() {
    return await autoUpdater.checkForUpdatesAndNotify();
  }
}

// Create singleton instance
let updaterInstance = null;

export function getAutoUpdater() {
  if (!updaterInstance) {
    updaterInstance = new AutoUpdaterManager();
  }
  return updaterInstance;
}

export default getAutoUpdater();
