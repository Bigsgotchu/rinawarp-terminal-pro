/**
 * Unit Tests for Permission Checker (Policy)
 *
 * Tests for validating agent permissions using Node.js built-in test runner.
 */

const { classifyRisk, requiresConfirmation, getRiskDescription, analyzeCommand } = require('../dist/policy.js')

const { test, describe } = require('node:test')
const assert = require('node:assert')

describe('Permission Checker - Risk Classification', () => {
  test('should classify rm -rf as high risk', () => {
    assert.strictEqual(classifyRisk('rm -rf /'), 'high')
  })

  test('should classify shutdown as high risk', () => {
    assert.strictEqual(classifyRisk('shutdown -h now'), 'high')
  })

  test('should classify reboot as high risk', () => {
    assert.strictEqual(classifyRisk('reboot'), 'high')
  })

  test('should classify mkfs as high risk', () => {
    assert.strictEqual(classifyRisk('mkfs /dev/sda1'), 'high')
  })

  test('should classify dd as high risk', () => {
    assert.strictEqual(classifyRisk('dd if=/dev/zero of=/dev/sda'), 'high')
  })

  test('should classify sudo as medium risk', () => {
    assert.strictEqual(classifyRisk('sudo apt-get install vim'), 'medium')
  })

  test('should classify kill -9 as medium risk', () => {
    assert.strictEqual(classifyRisk('kill -9 1234'), 'medium')
  })

  test('should classify npm install as low risk', () => {
    assert.strictEqual(classifyRisk('npm install'), 'low')
  })

  test('should classify git status as low risk', () => {
    assert.strictEqual(classifyRisk('git status'), 'low')
  })

  test('should classify docker ps as low risk', () => {
    assert.strictEqual(classifyRisk('docker ps'), 'low')
  })

  test('should handle docker system prune as high risk', () => {
    assert.strictEqual(classifyRisk('docker system prune -af'), 'high')
  })

  test('should handle docker rm -f as high risk', () => {
    assert.strictEqual(classifyRisk('docker rm -f container_id'), 'high')
  })

  test('should handle pkill -9 as high risk', () => {
    assert.strictEqual(classifyRisk('pkill -9 node'), 'high')
  })

  test('should handle killall -9 as high risk', () => {
    assert.strictEqual(classifyRisk('killall -9'), 'high')
  })

  test('should handle chown -R as high risk', () => {
    assert.strictEqual(classifyRisk('chown -R user:group /'), 'high')
  })

  test('should handle chmod -R as high risk', () => {
    assert.strictEqual(classifyRisk('chmod -R 777 /'), 'high')
  })

  test('should handle systemctl restart as medium risk', () => {
    assert.strictEqual(classifyRisk('systemctl restart docker'), 'medium')
  })
})

describe('requiresConfirmation', () => {
  test('should require confirmation for high risk', () => {
    assert.strictEqual(requiresConfirmation('high'), true)
  })

  test('should require confirmation for medium risk', () => {
    assert.strictEqual(requiresConfirmation('medium'), true)
  })

  test('should not require confirmation for low risk', () => {
    assert.strictEqual(requiresConfirmation('low'), false)
  })
})

describe('getRiskDescription', () => {
  test('should return description for rm -rf', () => {
    const desc = getRiskDescription('rm -rf /')
    assert.ok(desc.includes('recursively deletes files'))
  })

  test('should return description for shutdown', () => {
    const desc = getRiskDescription('shutdown -h now')
    assert.ok(desc.includes('shut down or restart'))
  })

  test('should return description for sudo', () => {
    const desc = getRiskDescription('sudo apt-get install vim')
    assert.ok(desc.includes('elevated privileges'))
  })

  test('should return null for safe commands', () => {
    const desc = getRiskDescription('git status')
    assert.strictEqual(desc, null)
  })
})

describe('analyzeCommand', () => {
  test('should return correct analysis for safe command', () => {
    const result = analyzeCommand('git status')
    assert.strictEqual(result.isSafe, true)
    assert.strictEqual(result.risk, 'low')
    assert.strictEqual(result.requiresConfirm, false)
  })

  test('should return correct analysis for dangerous command', () => {
    const result = analyzeCommand('rm -rf /')
    assert.strictEqual(result.isSafe, false)
    assert.strictEqual(result.risk, 'high')
    assert.strictEqual(result.requiresConfirm, true)
    assert.ok(result.description !== null)
  })
})
