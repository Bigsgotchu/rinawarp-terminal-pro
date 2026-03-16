/**
 * Terminal History Indexer
 * 
 * Indexes terminal command history for semantic search.
 * Uses the BlockManager to get command blocks.
 */

import { embedText } from '../embedding/embedder.js'
import { addVector, VectorDoc } from '../vector/vectorStore.js'

// Types for terminal blocks - we'll use a simple interface
// that matches the CommandBlock from rinawarp-agentd
export interface TerminalBlock {
  id: string
  command: string
  cwd: string
  startTime: Date
  endTime: Date | null
  status: 'running' | 'success' | 'error' | 'cancelled'
  exitCode: number | null
  signal: string | null
  stdout: string
  stderr: string
  metadata: Record<string, unknown>
}

/**
 * Terminal indexer configuration
 */
export interface TerminalIndexerConfig {
  /** Maximum number of blocks to index */
  maxBlocks: number
  /** Include successful commands */
  includeSuccess: boolean
  /** Include failed commands */
  includeError: boolean
  /** Include running commands */
  includeRunning: boolean
  /** Maximum output length per block */
  maxOutputLength: number
  /** Show progress logging */
  verbose: boolean
}

/**
 * Default terminal indexer configuration
 */
export const defaultTerminalIndexerConfig: TerminalIndexerConfig = {
  maxBlocks: 500,
  includeSuccess: true,
  includeError: true,
  includeRunning: false,
  maxOutputLength: 5000,
  verbose: false
}

// In-memory storage for blocks (simulating BlockManager)
let blockStore: TerminalBlock[] = []

/**
 * Set the block store (for integration with BlockManager)
 * 
 * @param blocks - Array of terminal blocks
 */
export function setBlockStore(blocks: TerminalBlock[]): void {
  blockStore = blocks
}

/**
 * Get current block store
 */
export function getBlockStore(): TerminalBlock[] {
  return blockStore
}

/**
 * Add a block to the store
 */
export function addBlock(block: TerminalBlock): void {
  // Remove existing block with same ID
  blockStore = blockStore.filter(b => b.id !== block.id)
  blockStore.push(block)
  
  // Trim to max size
  if (blockStore.length > defaultTerminalIndexerConfig.maxBlocks) {
    blockStore = blockStore.slice(-defaultTerminalIndexerConfig.maxBlocks)
  }
}

/**
 * Clear the block store
 */
export function clearBlockStore(): void {
  blockStore = []
}

/**
 * Index terminal history
 * 
 * @param config - Optional configuration
 * @returns Promise resolving to indexed block count
 */
export async function indexTerminalHistory(
  config: Partial<TerminalIndexerConfig> = {}
): Promise<number> {
  const cfg = { ...defaultTerminalIndexerConfig, ...config }
  
  if (cfg.verbose) {
    console.log(`[TerminalIndexer] Starting indexing of terminal history`)
  }
  
  // Filter blocks based on configuration
  const blocks = blockStore.filter(block => {
    if (block.status === 'running' && !cfg.includeRunning) {
      return false
    }
    if (block.status === 'success' && !cfg.includeSuccess) {
      return false
    }
    if (block.status === 'error' && !cfg.includeError) {
      return false
    }
    return true
  })
  
  // Limit to maxBlocks
  const blocksToIndex = blocks.slice(-cfg.maxBlocks)
  
  if (cfg.verbose) {
    console.log(`[TerminalIndexer] Found ${blocksToIndex.length} blocks to index`)
  }
  
  let indexedCount = 0
  
  for (const block of blocksToIndex) {
    try {
      await indexBlock(block, cfg)
      indexedCount++
    } catch (error) {
      if (cfg.verbose) {
        console.warn(`[TerminalIndexer] Failed to index block ${block.id}:`, error)
      }
    }
  }
  
  if (cfg.verbose) {
    console.log(`[TerminalIndexer] Completed. Indexed ${indexedCount} blocks`)
  }
  
  return indexedCount
}

/**
 * Index a single terminal block
 */
async function indexBlock(block: TerminalBlock, config: TerminalIndexerConfig): Promise<VectorDoc> {
  // Build text representation
  let text = `Command: ${block.command}\n`
  
  if (block.cwd) {
    text += `Working Directory: ${block.cwd}\n`
  }
  
  text += `Status: ${block.status}`
  
  if (block.exitCode !== null) {
    text += ` (exit code: ${block.exitCode})`
  }
  text += '\n'
  
  // Add stdout
  let stdout = block.stdout
  if (stdout.length > config.maxOutputLength) {
    stdout = stdout.slice(0, config.maxOutputLength) + '\n... (truncated)'
  }
  
  if (stdout.trim()) {
    text += `\nOutput:\n${stdout}\n`
  }
  
  // Add stderr
  let stderr = block.stderr
  if (stderr.length > config.maxOutputLength) {
    stderr = stderr.slice(0, config.maxOutputLength) + '\n... (truncated)'
  }
  
  if (stderr.trim()) {
    text += `\nErrors:\n${stderr}\n`
  }
  
  // Generate embedding
  const embedding = await embedText(text)
  
  // Add to vector store
  return addVector({
    id: `terminal:${block.id}`,
    text,
    embedding,
    metadata: {
      type: 'terminal',
      blockId: block.id,
      command: block.command,
      cwd: block.cwd,
      status: block.status,
      exitCode: block.exitCode,
      startTime: block.startTime.toISOString(),
      endTime: block.endTime?.toISOString() || null
    }
  })
}

/**
 * Get statistics about indexed terminal history
 */
export function getTerminalStats(): {
  total: number
  running: number
  success: number
  error: number
  cancelled: number
} {
  const stats = {
    total: blockStore.length,
    running: 0,
    success: 0,
    error: 0,
    cancelled: 0
  }
  
  for (const block of blockStore) {
    stats[block.status]++
  }
  
  return stats
}

/**
 * Search terminal history by command
 */
export function searchByCommand(pattern: string): TerminalBlock[] {
  const regex = new RegExp(pattern, 'i')
  return blockStore.filter(b => regex.test(b.command))
}

/**
 * Get recent blocks
 */
export function getRecentBlocks(count: number): TerminalBlock[] {
  return blockStore.slice(-count)
}

/**
 * Get failed blocks
 */
export function getFailedBlocks(): TerminalBlock[] {
  return blockStore.filter(b => b.status === 'error')
}
