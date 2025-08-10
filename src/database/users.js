/**
 * RinaWarp Terminal - User Management Database
 * Handles user accounts, authentication, and role-based permissions
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rinawarp_users.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// User roles and permissions
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  USER: 'USER',
  SUPPORT: 'SUPPORT'
};

export const PERMISSIONS = {
  // User management
  'users:read': 'View user accounts',
  'users:write': 'Create/edit user accounts',
  'users:delete': 'Delete user accounts',
  
  // Admin dashboard
  'admin:dashboard': 'Access admin dashboard',
  'admin:metrics': 'View system metrics',
  'admin:settings': 'Modify system settings',
  
  // License management
  'licenses:read': 'View licenses',
  'licenses:write': 'Create/edit licenses',
  'licenses:delete': 'Delete licenses',
  
  // Support
  'support:read': 'View support tickets',
  'support:write': 'Handle support tickets',
  
  // Analytics
  'analytics:read': 'View analytics data',
  'analytics:export': 'Export analytics data'
};

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.keys(PERMISSIONS),
  [ROLES.ADMIN]: [
    'users:read', 'users:write',
    'admin:dashboard', 'admin:metrics', 'admin:settings',
    'licenses:read', 'licenses:write', 'licenses:delete',
    'support:read', 'support:write',
    'analytics:read', 'analytics:export'
  ],
  [ROLES.MODERATOR]: [
    'users:read',
    'admin:dashboard', 'admin:metrics',
    'licenses:read', 'licenses:write',
    'support:read', 'support:write',
    'analytics:read'
  ],
  [ROLES.SUPPORT]: [
    'users:read',
    'admin:dashboard',
    'support:read', 'support:write',
    'analytics:read'
  ],
  [ROLES.USER]: []
};

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      is_active BOOLEAN DEFAULT 1,
      email_verified BOOLEAN DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      email_verification_token TEXT,
      login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME
    )
  `);

  // User sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      is_revoked BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // User permissions table (for custom permissions beyond roles)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission TEXT NOT NULL,
      granted_by INTEGER,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users (id),
      UNIQUE(user_id, permission)
    )
  `);

  // Audit log for security tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT,
      details JSON,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
  `);

  console.log('✅ User database initialized with all tables');
}

// Initialize the database
initializeDatabase();

// Prepared statements
const statements = {
  // User management
  createUser: db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getUserByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ? AND is_active = 1
  `),
  
  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ? AND is_active = 1
  `),
  
  updateUser: db.prepare(`
    UPDATE users 
    SET first_name = ?, last_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  updateLastLogin: db.prepare(`
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL
    WHERE id = ?
  `),
  
  updatePasswordHash: db.prepare(`
    UPDATE users 
    SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  incrementLoginAttempts: db.prepare(`
    UPDATE users 
    SET login_attempts = login_attempts + 1, locked_until = CASE 
      WHEN login_attempts >= 4 THEN datetime('now', '+30 minutes')
      ELSE locked_until 
    END
    WHERE email = ?
  `),
  
  // Session management
  createSession: db.prepare(`
    INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getSession: db.prepare(`
    SELECT s.*, u.email, u.role, u.is_active 
    FROM user_sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.session_token = ? AND s.is_revoked = 0 AND s.expires_at > datetime('now')
  `),
  
  revokeSession: db.prepare(`
    UPDATE user_sessions SET is_revoked = 1 WHERE session_token = ?
  `),
  
  revokeAllUserSessions: db.prepare(`
    UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?
  `),
  
  cleanupExpiredSessions: db.prepare(`
    DELETE FROM user_sessions WHERE expires_at < datetime('now', '-7 days')
  `),
  
  // Permissions
  getUserPermissions: db.prepare(`
    SELECT permission FROM user_permissions WHERE user_id = ?
  `),
  
  grantPermission: db.prepare(`
    INSERT OR REPLACE INTO user_permissions (user_id, permission, granted_by)
    VALUES (?, ?, ?)
  `),
  
  revokePermission: db.prepare(`
    DELETE FROM user_permissions WHERE user_id = ? AND permission = ?
  `),
  
  // Audit logging
  logAuditEvent: db.prepare(`
    INSERT INTO audit_log (user_id, action, resource, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getAuditLog: db.prepare(`
    SELECT a.*, u.email as user_email 
    FROM audit_log a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY timestamp DESC 
    LIMIT ?
  `)
};

export class UserManager {
  // Password hashing configuration
  static SALT_ROUNDS = 12;
  static MAX_LOGIN_ATTEMPTS = 5;
  static LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  // Create a new user
  static async createUser(userData) {
    const { email, password, firstName, lastName, role = ROLES.USER, emailVerified = false } = userData;
    
    try {
      // Check if user already exists
      const existingUser = statements.getUserByEmail.get(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate role
      if (!Object.values(ROLES).includes(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create user
      const result = statements.createUser.run(
        email, 
        passwordHash, 
        firstName, 
        lastName, 
        role, 
        emailVerified ? 1 : 0
      );

      // Log audit event
      statements.logAuditEvent.run(
        null, 
        'USER_CREATED', 
        'users', 
        JSON.stringify({ email, role }), 
        null, 
        null
      );

      return {
        id: result.lastInsertRowid,
        email,
        firstName,
        lastName,
        role,
        emailVerified
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Authenticate user
  static async authenticateUser(email, password, ipAddress, userAgent) {
    try {
      const user = statements.getUserByEmail.get(email);
      
      if (!user) {
        // Still increment attempts for non-existent users to prevent enumeration
        statements.incrementLoginAttempts.run(email);
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account temporarily locked due to too many failed attempts');
      }

      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account is disabled');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        statements.incrementLoginAttempts.run(email);
        
        // Log failed attempt
        statements.logAuditEvent.run(
          user.id, 
          'LOGIN_FAILED', 
          'authentication', 
          JSON.stringify({ reason: 'invalid_password' }), 
          ipAddress, 
          userAgent
        );
        
        throw new Error('Invalid email or password');
      }

      // Update last login and reset attempts
      statements.updateLastLogin.run(user.id);

      // Log successful login
      statements.logAuditEvent.run(
        user.id, 
        'LOGIN_SUCCESS', 
        'authentication', 
        null, 
        ipAddress, 
        userAgent
      );

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        lastLogin: user.last_login
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Create user session
  static createSession(userId, ipAddress, userAgent) {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      statements.createSession.run(
        userId,
        sessionToken,
        refreshToken,
        expiresAt.toISOString(),
        ipAddress,
        userAgent
      );

      return {
        sessionToken,
        refreshToken,
        expiresAt
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Validate session
  static validateSession(sessionToken) {
    try {
      const session = statements.getSession.get(sessionToken);
      
      if (!session || !session.is_active) {
        return null;
      }

      return {
        userId: session.user_id,
        email: session.email,
        role: session.role,
        sessionId: session.id
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  // Get user permissions
  static getUserPermissions(userId, role) {
    try {
      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      
      // Get custom permissions
      const customPermissions = statements.getUserPermissions.all(userId)
        .map(row => row.permission);

      // Combine and deduplicate
      const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];
      
      return allPermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Check if user has permission
  static hasPermission(userId, role, permission) {
    const permissions = this.getUserPermissions(userId, role);
    return permissions.includes(permission);
  }

  // Revoke session
  static revokeSession(sessionToken) {
    try {
      statements.revokeSession.run(sessionToken);
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  }

  // Revoke all user sessions (useful for logout all devices)
  static revokeAllUserSessions(userId) {
    try {
      statements.revokeAllUserSessions.run(userId);
      
      // Log audit event
      statements.logAuditEvent.run(
        userId, 
        'LOGOUT_ALL_SESSIONS', 
        'authentication', 
        null, 
        null, 
        null
      );
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      throw error;
    }
  }

  // Update user password
  static async updatePassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
      statements.updatePasswordHash.run(passwordHash, userId);
      
      // Revoke all sessions to force re-login
      this.revokeAllUserSessions(userId);
      
      // Log audit event
      statements.logAuditEvent.run(
        userId, 
        'PASSWORD_CHANGED', 
        'users', 
        null, 
        null, 
        null
      );
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Get user by ID
  static getUserById(userId) {
    try {
      const user = statements.getUserById.get(userId);
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Cleanup expired sessions
  static cleanupExpiredSessions() {
    try {
      const result = statements.cleanupExpiredSessions.run();
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }

  // Get audit log
  static getAuditLog(limit = 100) {
    try {
      return statements.getAuditLog.all(limit);
    } catch (error) {
      console.error('Error getting audit log:', error);
      return [];
    }
  }
}

// Setup periodic cleanup
setInterval(() => {
  UserManager.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Every hour

export default UserManager;
