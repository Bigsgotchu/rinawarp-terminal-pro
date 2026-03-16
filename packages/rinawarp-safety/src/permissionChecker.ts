/**
 * Permission Checker
 *
 * Validates agent permissions before execution.
 * This is a critical security component that enforces the permission system.
 */

export type Permission = 'docker' | 'npm' | 'filesystem:read' | 'filesystem:write' | 'network' | 'process' | 'terminal'

export const VALID_PERMISSIONS: Permission[] = [
  'docker',
  'npm',
  'filesystem:read',
  'filesystem:write',
  'network',
  'process',
  'terminal',
]

/**
 * Check if a permission string is valid
 */
export function isValidPermission(permission: string): boolean {
  return VALID_PERMISSIONS.includes(permission as Permission)
}

/**
 * Validate permissions array
 */
export function validatePermissions(permissions: string[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!Array.isArray(permissions)) {
    errors.push('Permissions must be an array')
    return { valid: false, errors }
  }

  if (permissions.length === 0) {
    errors.push('At least one permission is required')
    return { valid: false, errors }
  }

  for (const permission of permissions) {
    if (typeof permission !== 'string') {
      errors.push(`Invalid permission: ${permission} must be a string`)
      continue
    }

    if (!isValidPermission(permission)) {
      errors.push(`Unknown permission: ${permission}. Valid permissions are: ${VALID_PERMISSIONS.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Check if agent has required permission
 */
export function hasPermission(agentPermissions: string[], required: string): boolean {
  return agentPermissions.includes(required)
}

/**
 * Check if agent has all required permissions
 */
export function hasAllPermissions(agentPermissions: string[], required: string[]): boolean {
  return required.every((p) => agentPermissions.includes(p))
}

/**
 * Check if agent has any of the required permissions
 */
export function hasAnyPermission(agentPermissions: string[], required: string[]): boolean {
  return required.some((p) => agentPermissions.includes(p))
}

/**
 * Get missing permissions
 */
export function getMissingPermissions(agentPermissions: string[], required: string[]): string[] {
  return required.filter((p) => !agentPermissions.includes(p))
}

/**
 * Permission checker result
 */
export interface PermissionCheckResult {
  allowed: boolean
  missingPermissions: string[]
  error?: string
}

/**
 * Check if an action is allowed based on permissions
 */
export function checkPermission(agentPermissions: string[], requiredPermission: string): PermissionCheckResult {
  if (!agentPermissions || agentPermissions.length === 0) {
    return {
      allowed: false,
      missingPermissions: [requiredPermission],
      error: 'Agent has no permissions',
    }
  }

  const hasAccess = agentPermissions.includes(requiredPermission)

  if (!hasAccess) {
    return {
      allowed: false,
      missingPermissions: [requiredPermission],
      error: `Permission denied: ${requiredPermission}`,
    }
  }

  return {
    allowed: true,
    missingPermissions: [],
  }
}

/**
 * Check multiple permissions at once
 */
export function checkPermissions(agentPermissions: string[], requiredPermissions: string[]): PermissionCheckResult {
  if (!agentPermissions || agentPermissions.length === 0) {
    return {
      allowed: false,
      missingPermissions: requiredPermissions,
      error: 'Agent has no permissions',
    }
  }

  const missing = getMissingPermissions(agentPermissions, requiredPermissions)

  if (missing.length > 0) {
    return {
      allowed: false,
      missingPermissions: missing,
      error: `Permission denied: ${missing.join(', ')}`,
    }
  }

  return {
    allowed: true,
    missingPermissions: [],
  }
}
