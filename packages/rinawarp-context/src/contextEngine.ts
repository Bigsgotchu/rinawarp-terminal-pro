/**
 * Context Engine
 * 
 * Main entry point for the RinaWarp Local Context Index Engine.
 * Provides a unified interface for building and querying context.
 */

import { indexProject, FileIndexerConfig, defaultFileIndexerConfig } from './indexer/fileIndexer.js'
import { indexTerminalHistory, TerminalIndexerConfig, defaultTerminalIndexerConfig, setBlockStore, clearBlockStore, TerminalBlock } from './indexer/terminalIndexer.js'
import { indexGit, GitIndexerConfig, defaultGitIndexerConfig, isGitRepo } from './indexer/gitIndexer.js'
import { searchContext, SearchConfig, defaultSearchConfig, formatContextForPrompt, ContextResult, searchFiles, searchTerminal, searchGit } from './retrieval/search.js'
import { getStoreSize, clearStore, getAllVectors } from './vector/vectorStore.js'
import { getEmbeddingModel, setEmbeddingModel, EmbeddingModel, getModelInfo } from './embedding/embedder.js'

/**
 * Context Engine configuration
 */
export interface ContextEngineConfig {
  /** Project root directory */
  projectRoot: string
  /** File indexing configuration */
  fileConfig?: Partial<FileIndexerConfig>
  /** Terminal indexing configuration */
  terminalConfig?: Partial<TerminalIndexerConfig>
  /** Git indexing configuration */
  gitConfig?: Partial<GitIndexerConfig>
  /** Search configuration */
  searchConfig?: Partial<SearchConfig>
  /** Enable automatic re-indexing on changes */
  autoReindex?: boolean
  /** Show verbose logging */
  verbose?: boolean
}

/**
 * Build result with statistics
 */
export interface BuildResult {
  success: boolean
  totalIndexed: number
  filesIndexed: number
  terminalBlocksIndexed: number
  gitItemsIndexed: number
  errors: string[]
  duration: number
}

/**
 * Query result
 */
export interface QueryResult {
  query: string
  results: ContextResult[]
  formattedContext: string
  timing: number
}

/**
 * Context Engine Status
 */
export interface ContextEngineStatus {
  isBuilt: boolean
  projectRoot: string | null
  totalDocuments: number
  embeddingModel: EmbeddingModel
  modelInfo: ReturnType<typeof getModelInfo>
}

/**
 * Context Engine
 * 
 * Main class for managing local context indexing and retrieval.
 */
export class ContextEngine {
  private projectRoot: string | null = null
  private isBuilt: boolean = false
  private config: ContextEngineConfig | null = null
  
  /**
   * Initialize the context engine
   */
  constructor() {
    // Empty constructor - can be configured later
  }
  
  /**
   * Build the context index for a project
   * 
   * @param projectRoot - Root directory of the project
   * @returns Promise resolving to build result
   */
  async build(projectRoot: string): Promise<BuildResult> {
    const startTime = Date.now()
    const errors: string[] = []
    
    this.projectRoot = projectRoot
    this.config = { projectRoot }
    
    // Clear existing index
    clearStore()
    clearBlockStore()
    
    let filesIndexed = 0
    let terminalBlocksIndexed = 0
    let gitItemsIndexed = 0
    
    // Index files
    try {
      filesIndexed = await indexProject(projectRoot, {
        ...defaultFileIndexerConfig,
        ...this.config?.fileConfig,
        verbose: this.config?.verbose
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`File indexing failed: ${message}`)
    }
    
    // Index terminal history (if blocks are available)
    try {
      terminalBlocksIndexed = await indexTerminalHistory({
        ...defaultTerminalIndexerConfig,
        ...this.config?.terminalConfig,
        verbose: this.config?.verbose
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Terminal indexing failed: ${message}`)
    }
    
    // Index git (if it's a git repo)
    if (isGitRepo(projectRoot)) {
      try {
        gitItemsIndexed = await indexGit(projectRoot, {
          ...defaultGitIndexerConfig,
          ...this.config?.gitConfig,
          verbose: this.config?.verbose
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`Git indexing failed: ${message}`)
      }
    }
    
    const duration = Date.now() - startTime
    const totalIndexed = filesIndexed + terminalBlocksIndexed + gitItemsIndexed
    
    this.isBuilt = totalIndexed > 0
    
    return {
      success: errors.length === 0,
      totalIndexed,
      filesIndexed,
      terminalBlocksIndexed,
      gitItemsIndexed,
      errors,
      duration
    }
  }
  
  /**
   * Query the context index
   * 
   * @param prompt - The user's prompt/query
   * @param topK - Number of results to return
   * @returns Promise resolving to query result
   */
  async query(prompt: string, topK: number = 5): Promise<QueryResult> {
    const startTime = Date.now()
    
    const results = await searchContext(prompt, {
      ...defaultSearchConfig,
      ...this.config?.searchConfig,
      topK
    })
    
    const formattedContext = formatContextForPrompt(results)
    const timing = Date.now() - startTime
    
    return {
      query: prompt,
      results,
      formattedContext,
      timing
    }
  }
  
  /**
   * Query only file context
   */
  async queryFiles(prompt: string, topK: number = 5): Promise<QueryResult> {
    const startTime = Date.now()
    const results = await searchFiles(prompt, topK)
    const formattedContext = formatContextForPrompt(results)
    
    return {
      query: prompt,
      results,
      formattedContext,
      timing: Date.now() - startTime
    }
  }
  
  /**
   * Query only terminal context
   */
  async queryTerminal(prompt: string, topK: number = 5): Promise<QueryResult> {
    const startTime = Date.now()
    const results = await searchTerminal(prompt, topK)
    const formattedContext = formatContextForPrompt(results)
    
    return {
      query: prompt,
      results,
      formattedContext,
      timing: Date.now() - startTime
    }
  }
  
  /**
   * Query only git context
   */
  async queryGit(prompt: string, topK: number = 5): Promise<QueryResult> {
    const startTime = Date.now()
    const results = await searchGit(prompt, topK)
    const formattedContext = formatContextForPrompt(results)
    
    return {
      query: prompt,
      results,
      formattedContext,
      timing: Date.now() - startTime
    }
  }
  
  /**
   * Set terminal blocks for indexing
   * 
   * @param blocks - Array of terminal blocks
   */
  setTerminalBlocks(blocks: TerminalBlock[]): void {
    setBlockStore(blocks)
  }
  
  /**
   * Rebuild the index (useful after changes)
   * 
   * @returns Promise resolving to build result
   */
  async rebuild(): Promise<BuildResult> {
    if (!this.projectRoot) {
      throw new Error('No project root set. Call build() first.')
    }
    return this.build(this.projectRoot)
  }
  
  /**
   * Get the current status
   */
  getStatus(): ContextEngineStatus {
    return {
      isBuilt: this.isBuilt,
      projectRoot: this.projectRoot,
      totalDocuments: getStoreSize(),
      embeddingModel: getEmbeddingModel(),
      modelInfo: getModelInfo()
    }
  }
  
  /**
   * Check if the engine is ready
   */
  isReady(): boolean {
    return this.isBuilt
  }
  
  /**
   * Get all indexed documents
   */
  getAllDocuments() {
    return getAllVectors()
  }
  
  /**
   * Clear the index
   */
  clear(): void {
    clearStore()
    clearBlockStore()
    this.isBuilt = false
  }
}

// Export singleton instance for convenience
let contextEngineInstance: ContextEngine | null = null

/**
 * Get the global ContextEngine instance
 */
export function getContextEngine(): ContextEngine {
  if (!contextEngineInstance) {
    contextEngineInstance = new ContextEngine()
  }
  return contextEngineInstance
}

/**
 * Reset the global ContextEngine instance
 */
export function resetContextEngine(): void {
  contextEngineInstance = null
}

// Re-export types
export type { VectorDoc, SearchResult } from './vector/vectorStore.js'
export type { ContextResult, SearchConfig } from './retrieval/search.js'
export type { FileIndexerConfig } from './indexer/fileIndexer.js'
export type { TerminalIndexerConfig } from './indexer/terminalIndexer.js'
export type { GitIndexerConfig } from './indexer/gitIndexer.js'
