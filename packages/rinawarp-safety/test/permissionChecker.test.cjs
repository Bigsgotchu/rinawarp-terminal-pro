/**
 * Unit Tests for Permission Checker
 *
 * Tests for validating agent permissions.
 */

const {
  isValidPermission,
  validatePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getMissingPermissions,
  checkPermission,
  checkPermissions,
  VALID_PERMISSIONS,
} = require('../dist/permissionChecker.js')

const { test, describe } = require('node:test')
const assert = require('node:assert')

describe('Permission Checker', () => {
  describe('isValidPermission', () => {
    test('should return true for valid permissions', () => {
      assert.strictEqual(isValidPermission('docker'), true)
      assert.strictEqual(isValidPermission('npm'), true)
      assert.strictEqual(isValidPermission('filesystem:read'), true)
      assert.strictEqual(isValidPermission('filesystem:write'), true)
      assert.strictEqual(isValidPermission('network'), true)
      assert.strictEqual(isValidPermission('process'), true)
      assert.strictEqual(isValidPermission('terminal'), true)
    })

    test('should return false for invalid permissions', () => {
      assert.strictEqual(isValidPermission('invalid'), false)
      assert.strictEqual(isValidPermission('root'), false)
      assert.strictEqual(isValidPermission(''), false)
    })
  })

  describe('validatePermissions', () => {
    test('should validate correct permissions', () => {
      const result = validatePermissions(['docker', 'npm'])
      assert.strictEqual(result.valid, true)
      assert.strictEqual(result.errors.length, 0)
    })

    test('should reject invalid permissions', () => {
      const result = validatePermissions(['docker', 'invalid_permission'])
      assert.strictEqual(result.valid, false)
      assert.ok(result.errors.length > 0)
    })

    test('should reject empty array', () => {
      const result = validatePermissions([])
      assert.strictEqual(result.valid, false)
      assert.ok(result.errors.some((e) => e.includes('At least one')))
    })

    test('should reject non-array', () => {
      const result = validatePermissions('docker')
      assert.strictEqual(result.valid, false)
    })
  })

  describe('hasPermission', () => {
    test('should return true when permission exists', () => {
      const perms = ['docker', 'npm', 'filesystem:write']
      assert.strictEqual(hasPermission(perms, 'docker'), true)
      assert.strictEqual(hasPermission(perms, 'npm'), true)
    })

    test('should return false when permission missing', () => {
      const perms = ['docker', 'npm']
      assert.strictEqual(hasPermission(perms, 'network'), false)
    })
  })

  describe('hasAllPermissions', () => {
    test('should return true when all permissions exist', () => {
      const perms = ['docker', 'npm', 'filesystem:write']
      assert.strictEqual(hasAllPermissions(perms, ['docker', 'npm']), true)
    })

    test('should return false when any permission missing', () => {
      const perms = ['docker', 'npm']
      assert.strictEqual(hasAllPermissions(perms, ['docker', 'network']), false)
    })
  })

  describe('hasAnyPermission', () => {
    test('should return true when any permission exists', () => {
      const perms = ['docker', 'npm']
      assert.strictEqual(hasAnyPermission(perms, ['docker', 'network']), true)
    })

    test('should return false when no permissions exist', () => {
      const perms = ['docker', 'npm']
      assert.strictEqual(hasAnyPermission(perms, ['network', 'process']), false)
    })
  })

  describe('getMissingPermissions', () => {
    test('should return empty array when all permissions exist', () => {
      const perms = ['docker', 'npm']
      const result = getMissingPermissions(perms, ['docker', 'npm'])
      assert.strictEqual(result.length, 0)
    })

    test('should return missing permissions', () => {
      const perms = ['docker']
      const result = getMissingPermissions(perms, ['docker', 'npm', 'network'])
      assert.strictEqual(result.length, 2)
      assert.ok(result.includes('npm'))
      assert.ok(result.includes('network'))
    })
  })

  describe('checkPermission', () => {
    test('should allow action with valid permission', () => {
      const result = checkPermission(['docker', 'npm'], 'docker')
      assert.strictEqual(result.allowed, true)
      assert.strictEqual(result.missingPermissions.length, 0)
    })

    test('should deny action without permission', () => {
      const result = checkPermission(['docker'], 'network')
      assert.strictEqual(result.allowed, false)
      assert.strictEqual(result.missingPermissions.includes('network'), true)
      assert.ok(result.error.includes('Permission denied'))
    })

    test('should handle empty permissions', () => {
      const result = checkPermission([], 'docker')
      assert.strictEqual(result.allowed, false)
      assert.ok(result.error.includes('no permissions'))
    })
  })

  describe('checkPermissions', () => {
    test('should allow when all required permissions exist', () => {
      const result = checkPermissions(['docker', 'npm', 'network'], ['docker', 'npm'])
      assert.strictEqual(result.allowed, true)
    })

    test('should deny when any required permission missing', () => {
      const result = checkPermissions(['docker'], ['docker', 'network'])
      assert.strictEqual(result.allowed, false)
      assert.strictEqual(result.missingPermissions.includes('network'), true)
    })
  })
})
