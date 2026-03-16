/**
 * Safety Policies
 *
 * Defines blocked and warning patterns for command safety.
 */

import type { RiskLevel } from './risk.js'

export interface SafetyPattern {
  pattern: string
  description: string
}

export interface SafetyPolicy {
  blockedPatterns: SafetyPattern[]
  warningPatterns: SafetyPattern[]
  allowDestructive: boolean
}

export type PolicyType = 'strict' | 'permissive'

/**
 * Strict safety policy - blocks dangerous commands
 */
export function createStrictPolicy(): SafetyPolicy {
  return {
    blockedPatterns: [
      { pattern: 'rm -rf /', description: 'Recursive delete from root' },
      { pattern: 'rm -rf /*', description: 'Recursive delete from root' },
      { pattern: 'mkfs', description: 'Filesystem creation' },
      { pattern: 'dd if=', description: 'Raw disk write' },
      { pattern: 'shutdown', description: 'System shutdown' },
      { pattern: 'reboot', description: 'System reboot' },
      { pattern: ':(){:|:&};:', description: 'Fork bomb' },
      { pattern: '> /dev/sda', description: 'Direct disk write' },
      { pattern: 'chmod -R 777 /', description: 'World-writable root' },
      { pattern: 'chmod -R 777 .', description: 'World-writable files' },
      { pattern: 'wipe', description: 'Secure deletion' },
      { pattern: 'shred', description: 'Secure file deletion' },
    ],
    warningPatterns: [
      { pattern: 'sudo rm', description: 'Root delete operation' },
      { pattern: 'kill -9', description: 'Force kill process' },
      { pattern: 'chown -R', description: 'Recursive ownership change' },
      { pattern: 'curl | sh', description: 'Execute remote script' },
      { pattern: 'wget -O- | sh', description: 'Execute remote script' },
      { pattern: 'iptables', description: 'Firewall modification' },
      { pattern: 'ufw', description: 'Firewall modification' },
      { pattern: 'systemctl restart', description: 'Service restart' },
      { pattern: 'service restart', description: 'Service restart' },
    ],
    allowDestructive: false,
  }
}

/**
 * Permissive policy - for experienced users
 */
export function createPermissivePolicy(): SafetyPolicy {
  return {
    blockedPatterns: [
      { pattern: 'rm -rf /', description: 'Recursive delete from root' },
      { pattern: ':(){:|:&};:', description: 'Fork bomb' },
    ],
    warningPatterns: [],
    allowDestructive: true,
  }
}

/**
 * Get policy by type
 */
export function getPolicy(type: PolicyType): SafetyPolicy {
  switch (type) {
    case 'strict':
      return createStrictPolicy()
    case 'permissive':
      return createPermissivePolicy()
  }
}
