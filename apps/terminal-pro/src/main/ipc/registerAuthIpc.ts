/**
 * RinaWarp Terminal Pro - Authentication IPC Handler
 * 
 * Handles authentication between the desktop app and website auth system
 */

import type { IpcMain, BrowserWindow } from 'electron'

export interface AuthConfig {
  apiBaseUrl: string
  deviceId: string
}

let authConfig: AuthConfig | null = null
let cachedToken: string | null = null

/**
 * Set auth configuration
 */
export function setAuthConfig(config: AuthConfig): void {
  authConfig = config
}

/**
 * Get current auth config
 */
export function getAuthConfig(): AuthConfig | null {
  return authConfig
}

/**
 * Set cached token (from previous session)
 */
export function setCachedToken(token: string | null): void {
  cachedToken = token
}

/**
 * Get cached token
 */
export function getCachedToken(): string | null {
  return cachedToken
}

/**
 * Register authentication IPC handlers
 */
export function registerAuthIpc(ipcMain: IpcMain, _mainWindow: BrowserWindow): void {
  // Remove existing handlers
  ipcMain.removeHandler('auth:login')
  ipcMain.removeHandler('auth:register')
  ipcMain.removeHandler('auth:logout')
  ipcMain.removeHandler('auth:me')
  ipcMain.removeHandler('auth:forgot-password')
  ipcMain.removeHandler('auth:reset-password')
  ipcMain.removeHandler('auth:state')
  ipcMain.removeHandler('auth:token')
  
  // Login - authenticate with website auth system
  ipcMain.handle('auth:login', async (_event, args: { email: string; password: string }) => {
    if (!authConfig) {
      return { ok: false, error: 'Auth not configured' }
    }
    
    try {
      const response = await fetch(`${authConfig.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: args.email,
          password: args.password,
          deviceId: authConfig.deviceId,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Login failed' }
      }
      
      // Cache the token
      if (data.token) {
        cachedToken = data.token
      }
      
      return { ok: true, token: data.token, user: data.user }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Login failed' }
    }
  })
  
  // Register - create account via website auth system
  ipcMain.handle('auth:register', async (_event, args: { email: string; password: string; name?: string }) => {
    if (!authConfig) {
      return { ok: false, error: 'Auth not configured' }
    }
    
    try {
      const response = await fetch(`${authConfig.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: args.email,
          password: args.password,
          name: args.name,
          deviceId: authConfig.deviceId,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Registration failed' }
      }
      
      return { ok: true, message: data.message }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Registration failed' }
    }
  })
  
  // Logout - clear cached token
  ipcMain.handle('auth:logout', async () => {
    cachedToken = null
    return { ok: true }
  })
  
  // Get current user - verify token with website
  ipcMain.handle('auth:me', async () => {
    if (!authConfig || !cachedToken) {
      return { ok: false, error: 'Not authenticated' }
    }
    
    try {
      const response = await fetch(`${authConfig.apiBaseUrl}/api/auth/me`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cachedToken}`,
        },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        cachedToken = null
        return { ok: false, error: data.error || 'Failed to get user' }
      }
      
      return { ok: true, user: data.user }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to get user' }
    }
  })
  
  // Forgot password - request reset email
  ipcMain.handle('auth:forgot-password', async (_event, args: { email: string }) => {
    if (!authConfig) {
      return { ok: false, error: 'Auth not configured' }
    }
    
    try {
      const response = await fetch(`${authConfig.apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: args.email }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Request failed' }
      }
      
      return { ok: true, message: data.message }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Request failed' }
    }
  })
  
  // Reset password - set new password with token
  ipcMain.handle('auth:reset-password', async (_event, args: { token: string; password: string }) => {
    if (!authConfig) {
      return { ok: false, error: 'Auth not configured' }
    }
    
    try {
      const response = await fetch(`${authConfig.apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: args.token, password: args.password }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Reset failed' }
      }
      
      return { ok: true, message: data.message }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Reset failed' }
    }
  })
  
  // Get auth state
  ipcMain.handle('auth:state', async () => {
    if (cachedToken) {
      // Try to verify the token
      try {
        const response = await fetch(`${authConfig?.apiBaseUrl}/api/auth/me`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cachedToken}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          return { 
            authenticated: true, 
            user: data.user,
            token: cachedToken,
          }
        }
      } catch {
        // Token invalid
      }
    }
    
    return { authenticated: false, user: null, token: null }
  })
  
  // Get token (for API calls)
  ipcMain.handle('auth:token', async () => {
    return { token: cachedToken }
  })
  
  console.log('[IPC] Auth handlers registered')
}
