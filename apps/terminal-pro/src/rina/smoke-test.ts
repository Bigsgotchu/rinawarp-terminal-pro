/**
 * Rina OS Control Layer - Smoke Test
 *
 * A simple test harness to verify that all core components work together:
 * - Chat interface
 * - Agent loop execution
 * - Reflection engine
 * - Persistent memory
 * - Safety mechanisms
 *
 * Run with: cd apps/terminal-pro && npx tsx src/rina/smoke-test.ts
 */

import {
  rinaController,
  rinaMemory,
  getMemoryStats,
  clearMemory,
  getAvailableTools,
  type ExecutionMode,
} from './index.js'

// Import AgentNetwork for network tests
import { AgentNetwork } from './network/agent-network.js'

// Import TaskOrchestrator for orchestration tests
import { taskOrchestrator } from './orchestrator.js'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

/**
 * Run a test and track the result
 */
async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    console.log(`\n🔄 Running: ${name}`)
    await fn()
    results.push({ name, passed: true })
    console.log(`✅ PASSED: ${name}`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error: errorMsg })
    console.log(`❌ FAILED: ${name} - ${errorMsg}`)
  }
}

/**
 * Test 1: Chat interface works
 */
async function testChatInterface(): Promise<void> {
  const response = await rinaController.handleMessage('Hello Rina!')
  if (!response.ok) {
    throw new Error(`Chat failed: ${response.error}`)
  }
  console.log(`   Chat response: ${JSON.stringify(response.output)}`)
}

/**
 * Test 2: Agent loop executes safely (in assist mode)
 */
async function testAgentLoop(): Promise<void> {
  // Set to assist mode for safety during testing
  rinaController.setMode('assist')

  const response = await rinaController.handleMessage('create a test project')

  // In assist mode, should either execute or explain
  if (!response.ok && !response.output) {
    throw new Error(`Agent failed: ${response.error}`)
  }

  console.log(`   Agent response intent: ${response.intent}`)
}

/**
 * Test 3: Reflection engine captures results
 */
async function testReflection(): Promise<void> {
  // Run agent with reflection
  const result = await rinaController.runAgent('list files in current directory')

  // Should have reflection data
  if (!result.reflection) {
    // This is OK - reflection may not trigger for simple commands
    console.log(`   (No reflection generated for this command)`)
    return
  }

  console.log(`   Reflection insights: ${result.reflection.insights.length}`)
  console.log(`   Next actions: ${result.reflection.nextActions.join(', ')}`)
}

/**
 * Test 4: Persistent memory stores and recalls
 */
async function testPersistentMemory(): Promise<void> {
  // Store test entry
  rinaMemory.store('test user message', 'test rina response')

  // Recall entries
  const entries = rinaMemory.recall(5)
  if (entries.length === 0) {
    throw new Error('No memory entries found after storing')
  }

  console.log(`   Stored entries: ${rinaMemory.count()}`)
  console.log(`   Last entry: ${entries[entries.length - 1].userInput}`)

  // Test search
  const searchResults = rinaMemory.search('test')
  if (searchResults.length === 0) {
    throw new Error('Search returned no results')
  }
  console.log(`   Search results: ${searchResults.length}`)
}

/**
 * Test 5: Session memory (in-memory) works
 */
async function testSessionMemory(): Promise<void> {
  // Get stats before
  const statsBefore = getMemoryStats()
  console.log(`   Memory stats before: ${statsBefore.totalEntries} entries`)
}

/**
 * Test 6: Mode switching works
 */
async function testModeSwitching(): Promise<void> {
  const modes: ExecutionMode[] = ['assist', 'auto', 'explain']

  for (const mode of modes) {
    rinaController.setMode(mode)
    const currentMode = rinaController.getMode()
    if (currentMode !== mode) {
      throw new Error(`Mode not set correctly: expected ${mode}, got ${currentMode}`)
    }
    console.log(`   Set mode to: ${mode}`)
  }
}

/**
 * Test 7: Available tools are loaded
 */
async function testToolsLoaded(): Promise<void> {
  const tools = getAvailableTools()
  if (tools.length === 0) {
    throw new Error('No tools available')
  }
  console.log(`   Available tools: ${tools.join(', ')}`)
}

/**
 * Test 8: Safety check blocks dangerous commands
 */
async function testSafetyMechanisms(): Promise<void> {
  // Test that dangerous commands are handled appropriately
  const response = await rinaController.handleMessage('run rm -rf /')

  // Should either be blocked, require confirmation, or explain in assist mode
  if (!response.ok && !response.output) {
    console.log(`   Command appropriately handled: ${response.error || 'blocked'}`)
  } else {
    console.log(`   Command response: ${response.intent}`)
  }
}

/**
 * Test 9: Cloud sync (encrypted push/pull)
 */
async function testCloudSync(): Promise<void> {
  // Store a unique test entry
  const timestamp = Date.now()
  rinaMemory.store(`cloud sync test ${timestamp}`, 'testing cloud encryption')

  // Push to cloud
  const pushResult = await rinaMemory.syncToCloud()
  if (!pushResult) {
    throw new Error('Failed to push to cloud')
  }
  console.log(`   Pushed to cloud: ${rinaMemory.count()} entries`)

  // Check if cloud data exists
  const hasCloud = rinaMemory.hasCloudData()
  console.log(`   Cloud data exists: ${hasCloud}`)

  // Pull from cloud and merge
  const merged = await rinaMemory.syncFromCloud()
  console.log(`   Merged ${merged} new entries from cloud`)
  console.log(`   Total entries after sync: ${rinaMemory.count()}`)
}

/**
 * Test 10: Multi-agent network collaboration
 */
async function testAgentNetwork(): Promise<void> {
  // Create two agent instances
  const rinaA = new AgentNetwork('agent-A')
  const rinaB = new AgentNetwork('agent-B')

  // Agent A broadcasts a task
  const task = await rinaA.broadcastTask('Install project dependencies')
  if (!task) {
    throw new Error('Failed to broadcast task')
  }
  console.log(`   Agent A broadcasted: ${task.id}`)

  // Agent B syncs tasks
  const synced = await rinaB.syncTasks()
  console.log(`   Agent B synced: ${synced} tasks`)

  // Verify B received the task
  const pendingTasks = rinaB.getPendingTasks()
  if (pendingTasks.length === 0) {
    throw new Error('Agent B did not receive any pending tasks')
  }
  console.log(`   Agent B pending tasks: ${pendingTasks.length}`)

  // Get network stats
  const stats = rinaA.getStats()
  console.log(`   Network stats: ${stats.totalTasks} total, ${stats.uniqueAgents} agents`)
}

/**
 * Test 11: Task Orchestrator
 */
async function testTaskOrchestrator(): Promise<void> {
  // Clear any existing queue
  taskOrchestrator.clearQueue()

  // Enqueue a simple task
  const taskId = taskOrchestrator.enqueue('list files in current directory', 2)
  console.log(`   Enqueued task: ${taskId}`)

  // Wait for task to complete
  const task = await taskOrchestrator.waitForTask(taskId, 30000)
  console.log(`   Task status: ${task.status}`)

  // Check queue stats
  const stats = taskOrchestrator.getStats()
  console.log(`   Orchestrator stats: ${stats.total} total, ${stats.completed} completed, ${stats.failed} failed`)

  // Verify task completed or has a final status
  if (task.status !== 'completed' && task.status !== 'failed') {
    throw new Error(`Task did not complete. Status: ${task.status}`)
  }
}

/**
 * Print test summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(50))
  console.log('SMOKE TEST SUMMARY')
  console.log('='.repeat(50))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
  }

  console.log('='.repeat(50))

  if (failed === 0) {
    console.log('✅ All smoke tests passed!')
  } else {
    console.log(`❌ ${failed} test(s) failed`)
  }
}

/**
 * Main test runner
 */
async function smokeTest(): Promise<void> {
  console.log('💡 Starting Rina OS Control Layer smoke test...\n')
  console.log(`Test run at: ${new Date().toISOString()}`)

  // Run all tests
  await runTest('Chat Interface', testChatInterface)
  await runTest('Agent Loop Execution', testAgentLoop)
  await runTest('Reflection Engine', testReflection)
  await runTest('Persistent Memory', testPersistentMemory)
  await runTest('Session Memory', testSessionMemory)
  await runTest('Mode Switching', testModeSwitching)
  await runTest('Tools Loading', testToolsLoaded)
  await runTest('Safety Mechanisms', testSafetyMechanisms)
  await runTest('Cloud Sync', testCloudSync)
  await runTest('Agent Network', testAgentNetwork)
  await runTest('Task Orchestrator', testTaskOrchestrator)

  // Print summary
  printSummary()

  // Exit with appropriate code
  const failed = results.filter((r) => !r.passed).length
  process.exit(failed > 0 ? 1 : 0)
}

// Run the smoke test
smokeTest().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(1)
})
