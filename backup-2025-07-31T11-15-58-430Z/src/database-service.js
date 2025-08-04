/**
 * Database Service (Non-Firebase)
 * Local storage-based database service without Firebase dependencies
 */

import { authService } from './auth-service-enhanced.js';

class DatabaseService {
  constructor() {
    this.collections = {
      sessions: 'terminal_sessions',
      commands: 'command_history',
      userProfiles: 'user_profiles',
      settings: 'user_settings',
    };
  }

  // Helper method to get data from localStorage
  _getLocalData(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  // Helper method to save data to localStorage
  _setLocalData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }

  // Terminal Session Management
  async createSession(sessionData) {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const sessionId = `session_${Date.now()}`;
      const sessionDoc = {
        userId,
        sessionId: sessionData.sessionId || sessionId,
        title: sessionData.title || 'New Terminal Session',
        commands: sessionData.commands || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        environment: sessionData.environment || {},
        workingDirectory: sessionData.workingDirectory || '/',
        theme: sessionData.theme || 'default',
      };

      const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
      sessions.push({ id: sessionId, ...sessionDoc });
      this._setLocalData(`${this.collections.sessions}_${userId}`, sessions);

      return { success: true, sessionId };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  async saveSession(sessionId, sessionData) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex >= 0) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          ...sessionData,
          updatedAt: new Date().toISOString(),
        };
        this._setLocalData(`${this.collections.sessions}_${userId}`, sessions);
        return { success: true };
      }

      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Error saving session:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSessions(limitCount = 50) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
      const sortedSessions = sessions
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limitCount);

      return { success: true, sessions: sortedSessions };
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return { success: false, error: error.message };
    }
  }

  async getSession(sessionId) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
      const session = sessions.find(s => s.id === sessionId);

      if (session) {
        return { success: true, session };
      }
      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Error getting session:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSession(sessionId) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
      const filteredSessions = sessions.filter(s => s.id !== sessionId);

      if (filteredSessions.length < sessions.length) {
        this._setLocalData(`${this.collections.sessions}_${userId}`, filteredSessions);
        return { success: true };
      }

      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  }

  // Command History Management
  async saveCommand(command, sessionId = null) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const commandId = `cmd_${Date.now()}`;
      const commandDoc = {
        id: commandId,
        userId,
        sessionId,
        command: command.command || '',
        output: command.output || '',
        exitCode: command.exitCode || 0,
        workingDirectory: command.workingDirectory || '/',
        timestamp: new Date().toISOString(),
        executionTime: command.executionTime || 0,
      };

      const commands = this._getLocalData(`${this.collections.commands}_${userId}`, []);
      commands.push(commandDoc);

      // Keep only last 1000 commands
      if (commands.length > 1000) {
        commands.splice(0, commands.length - 1000);
      }

      this._setLocalData(`${this.collections.commands}_${userId}`, commands);
      return { success: true, commandId };
    } catch (error) {
      console.error('Error saving command:', error);
      return { success: false, error: error.message };
    }
  }

  async getCommandHistory(sessionId = null, limitCount = 100) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      let commands = this._getLocalData(`${this.collections.commands}_${userId}`, []);

      if (sessionId) {
        commands = commands.filter(cmd => cmd.sessionId === sessionId);
      }

      const sortedCommands = commands
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limitCount);

      return { success: true, commands: sortedCommands };
    } catch (error) {
      console.error('Error getting command history:', error);
      return { success: false, error: error.message };
    }
  }

  // User Profile Management
  async saveUserProfile(profileData) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const profile = {
        ...profileData,
        updatedAt: new Date().toISOString(),
      };

      this._setLocalData(`${this.collections.userProfiles}_${userId}`, profile);
      return { success: true };
    } catch (error) {
      console.error('Error saving user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile() {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const profile = this._getLocalData(`${this.collections.userProfiles}_${userId}`, null);

      if (profile) {
        return { success: true, profile };
      }
      return { success: false, error: 'Profile not found' };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // User Settings Management
  async saveUserSettings(settings) {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const settingsData = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };

      this._setLocalData(`${this.collections.settings}_${userId}`, settingsData);
      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSettings() {
    try {
      const userId = authService.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const settings = this._getLocalData(`${this.collections.settings}_${userId}`, null);

      if (settings) {
        return { success: true, settings };
      }
      return { success: false, error: 'Settings not found' };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listeners (mock implementation)
  listenToUserSessions(callback) {
    const userId = authService.getUserId();
    if (!userId) return null;

    // Return a mock unsubscribe function

    // Initial call with current data
    const sessions = this._getLocalData(`${this.collections.sessions}_${userId}`, []);
    callback(sessions);

    // Return unsubscribe function
    return () => {};
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
