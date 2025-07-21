import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase-config.js';
import { authService } from './auth-service.js';

class DatabaseService {
  constructor() {
    this.collections = {
      sessions: 'terminal_sessions',
      commands: 'command_history',
      userProfiles: 'user_profiles',
      settings: 'user_settings',
    };
  }

  // Terminal Session Management
  async createSession(sessionData) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const sessionDoc = {
        userId,
        sessionId: sessionData.sessionId || `session_${Date.now()}`,
        title: sessionData.title || 'New Terminal Session',
        commands: sessionData.commands || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        environment: sessionData.environment || {},
        workingDirectory: sessionData.workingDirectory || '/',
        theme: sessionData.theme || 'default',
      };

      const docRef = await addDoc(collection(db, this.collections.sessions), sessionDoc);
      console.log('Session created with ID:', docRef.id);
      return { success: true, sessionId: docRef.id };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  async saveSession(sessionId, sessionData) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const sessionRef = doc(db, this.collections.sessions, sessionId);
      await updateDoc(sessionRef, {
        ...sessionData,
        updatedAt: serverTimestamp(),
      });

      console.log('Session saved successfully');
      return { success: true };
    } catch (error) {
      console.error('Error saving session:', error);
      return { success: false, error: error.message };
    }
  }

  async getSession(sessionId) {
    try {
      const sessionRef = doc(db, this.collections.sessions, sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        return { success: true, session: { id: sessionSnap.id, ...sessionSnap.data() } };
      } else {
        return { success: false, error: 'Session not found' };
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSessions(limitCount = 50) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.collections.sessions),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];
      querySnapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, sessions };
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSession(sessionId) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      // Verify ownership before deletion
      const sessionResult = await this.getSession(sessionId);
      if (!sessionResult.success) {
        return { success: false, error: 'Session not found' };
      }

      if (sessionResult.session.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      await deleteDoc(doc(db, this.collections.sessions, sessionId));
      console.log('Session deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  }

  // Command History Management
  async saveCommand(command, sessionId = null) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const commandDoc = {
        userId,
        sessionId,
        command: command.command || '',
        output: command.output || '',
        exitCode: command.exitCode || 0,
        workingDirectory: command.workingDirectory || '/',
        timestamp: serverTimestamp(),
        executionTime: command.executionTime || 0,
      };

      const docRef = await addDoc(collection(db, this.collections.commands), commandDoc);
      return { success: true, commandId: docRef.id };
    } catch (error) {
      console.error('Error saving command:', error);
      return { success: false, error: error.message };
    }
  }

  async getCommandHistory(sessionId = null, limitCount = 100) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      let q;
      if (sessionId) {
        q = query(
          collection(db, this.collections.commands),
          where('userId', '==', userId),
          where('sessionId', '==', sessionId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, this.collections.commands),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const commands = [];
      querySnapshot.forEach(doc => {
        commands.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, commands };
    } catch (error) {
      console.error('Error getting command history:', error);
      return { success: false, error: error.message };
    }
  }

  // User Profile Management
  async saveUserProfile(profileData) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const profileRef = doc(db, this.collections.userProfiles, userId);
      await setDoc(
        profileRef,
        {
          ...profileData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile() {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const profileRef = doc(db, this.collections.userProfiles, userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        return { success: true, profile: profileSnap.data() };
      } else {
        return { success: false, error: 'Profile not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // User Settings Management
  async saveUserSettings(settings) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const settingsRef = doc(db, this.collections.settings, userId);
      await setDoc(
        settingsRef,
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSettings() {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const settingsRef = doc(db, this.collections.settings, userId);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        return { success: true, settings: settingsSnap.data() };
      } else {
        return { success: false, error: 'Settings not found' };
      }
    } catch (error) {
      console.error('Error getting user settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listeners
  listenToUserSessions(callback) {
    const userId = authService.getUserId();
    if (!userId) return null;

    const q = query(
      collection(db, this.collections.sessions),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, querySnapshot => {
      const sessions = [];
      querySnapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      callback(sessions);
    });
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
