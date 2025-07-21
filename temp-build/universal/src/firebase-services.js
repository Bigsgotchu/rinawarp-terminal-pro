// Firebase Services Integration
// This file provides a unified interface to all Firebase services

import { authService } from './auth-service.js';
import { databaseService } from './database-service.js';
import { storageService } from './storage-service.js';
import { analyticsService } from './analytics-service.js';

class FirebaseServices {
  constructor() {
    this.auth = authService;
    this.database = databaseService;
    this.storage = storageService;
    this.analytics = analyticsService;

    // Initialize analytics session
    this.analytics.startSession();

    // Set up auth state listener for cross-service coordination
    this.auth.onAuthStateChange(user => {
      if (user) {
        console.log('User authenticated:', user.email);
        this.analytics.trackLogin();
      } else {
        console.log('User signed out');
        this.analytics.trackLogout();
      }
    });

    // Handle page unload to track session end
    window.addEventListener('beforeunload', () => {
      this.analytics.endSession();
    });
  }

  // Convenience methods for common operations
  async initializeUser(email, password, displayName) {
    try {
      // Sign up user
      const signUpResult = await this.auth.signUp(email, password, displayName);
      if (!signUpResult.success) return signUpResult;

      // Track signup
      this.analytics.trackSignUp();

      // Create user profile
      const profileResult = await this.database.saveUserProfile({
        displayName: displayName,
        email: email,
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'default',
          notifications: true,
        },
      });

      // Create default settings
      const settingsResult = await this.database.saveUserSettings({
        theme: 'default',
        fontSize: 14,
        fontFamily: 'monospace',
        notifications: {
          email: true,
          push: false,
        },
        terminal: {
          saveHistory: true,
          autoSave: true,
          maxHistoryItems: 1000,
        },
      });

      return {
        success: true,
        user: signUpResult.user,
        profile: profileResult.success,
        settings: settingsResult.success,
      };
    } catch (error) {
      this.analytics.trackError(error, 'initialize_user');
      return { success: false, error: error.message };
    }
  }

  async createAndSaveSession(sessionData) {
    try {
      // Create session in database
      const dbResult = await this.database.createSession(sessionData);
      if (!dbResult.success) return dbResult;

      // Upload session to storage as backup
      const storageResult = await this.storage.uploadTerminalSession(
        sessionData,
        dbResult.sessionId
      );

      // Track session creation
      this.analytics.trackTerminalSession('create', sessionData);

      return {
        success: true,
        sessionId: dbResult.sessionId,
        backupUrl: storageResult.success ? storageResult.downloadURL : null,
      };
    } catch (error) {
      this.analytics.trackError(error, 'create_and_save_session');
      return { success: false, error: error.message };
    }
  }

  async executeAndLogCommand(command, sessionId) {
    try {
      const startTime = Date.now();

      // Here you would execute the actual command
      // For now, this is a placeholder
      const result = {
        command: command,
        output: 'Command executed successfully',
        exitCode: 0,
        workingDirectory: process.cwd ? process.cwd() : '/',
        executionTime: Date.now() - startTime,
      };

      // Save command to database
      const dbResult = await this.database.saveCommand(result, sessionId);

      // Track command execution
      this.analytics.trackCommandExecution(result);

      return {
        success: true,
        result: result,
        commandId: dbResult.commandId,
      };
    } catch (error) {
      this.analytics.trackError(error, 'execute_and_log_command');
      return { success: false, error: error.message };
    }
  }

  async uploadAndTrackFile(file, path = '') {
    try {
      const startTime = Date.now();

      // Upload file
      const uploadResult = await this.storage.uploadFile(file, path, progress => {
        // You can emit progress events here
        console.log('Upload progress:', progress.progress);
      });

      if (uploadResult.success) {
        const duration = Date.now() - startTime;

        // Track file upload
        this.analytics.trackFileUpload(file, {
          ...uploadResult,
          duration: duration,
        });
      }

      return uploadResult;
    } catch (error) {
      this.analytics.trackError(error, 'upload_and_track_file');
      return { success: false, error: error.message };
    }
  }

  // User management helpers
  async getUserDashboardData() {
    try {
      if (!this.auth.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      // Get user sessions
      const sessionsResult = await this.database.getUserSessions(10);

      // Get user files
      const filesResult = await this.storage.listUserFiles();

      // Get user profile
      const profileResult = await this.database.getUserProfile();

      // Get user settings
      const settingsResult = await this.database.getUserSettings();

      // Track dashboard view
      this.analytics.trackPageView('dashboard');

      return {
        success: true,
        data: {
          sessions: sessionsResult.sessions || [],
          files: filesResult.files || [],
          profile: profileResult.profile || {},
          settings: settingsResult.settings || {},
        },
      };
    } catch (error) {
      this.analytics.trackError(error, 'get_user_dashboard_data');
      return { success: false, error: error.message };
    }
  }

  // Analytics helpers
  trackFeatureUsage(feature) {
    this.analytics.trackFeatureUsage(feature);
  }

  trackUserEngagement(action, element) {
    this.analytics.trackUserEngagement(action, element);
  }

  trackError(error, context) {
    this.analytics.trackError(error, context);
  }

  // Cleanup and utilities
  async cleanup() {
    try {
      // End analytics session
      this.analytics.endSession();

      // Sign out user if needed
      if (this.auth.isAuthenticated()) {
        await this.auth.signOut();
      }

      return { success: true };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Service status checks
  getServiceStatus() {
    return {
      auth: {
        initialized: Boolean(this.auth),
        authenticated: this.auth.isAuthenticated(),
        user: this.auth.getCurrentUser(),
      },
      database: {
        initialized: Boolean(this.database),
      },
      storage: {
        initialized: Boolean(this.storage),
      },
      analytics: {
        initialized: Boolean(this.analytics),
        enabled: this.analytics.isEnabled(),
      },
    };
  }
}

// Export singleton instance
export const firebaseServices = new FirebaseServices();

// Export individual services for direct access
export { authService, databaseService, storageService, analyticsService };

// Example usage:
/*
// Authentication
await firebaseServices.auth.signIn('user@example.com', 'password');

// Create and save a terminal session
const sessionResult = await firebaseServices.createAndSaveSession({
    title: 'My Terminal Session',
    commands: ['ls', 'cd Documents', 'npm install'],
    theme: 'dark'
});

// Execute and log a command
const commandResult = await firebaseServices.executeAndLogCommand(
    'git status', 
    sessionResult.sessionId
);

// Upload a file
const fileInput = document.getElementById('file-input');
const uploadResult = await firebaseServices.uploadAndTrackFile(
    fileInput.files[0], 
    'configs'
);

// Get dashboard data
const dashboardData = await firebaseServices.getUserDashboardData();

// Track feature usage
firebaseServices.trackFeatureUsage('terminal_copy_paste');

// Track user engagement
firebaseServices.trackUserEngagement('click', 'new_session_button');
*/
