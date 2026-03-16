/**
 * RinaWarp Context Package
 * 
 * Local Context Index Engine for RinaWarp AI terminal.
 * Enables semantic understanding of codebase, terminal history, and project structure.
 */

// Main exports
export { ContextEngine, getContextEngine, resetContextEngine } from './contextEngine.js'
export type { BuildResult, QueryResult, ContextEngineStatus, ContextEngineConfig } from './contextEngine.js'

// Vector store exports
export {
  addVector,
  addVectors,
  searchVector,
  getVector,
  getAllVectors,
  deleteVector,
  clearStore,
  getStoreSize,
  getVectorsByMetadata,
  euclideanDistance,
  dotProduct,
  normalizeVector
} from './vector/vectorStore.js'
export type { VectorDoc, SearchResult, AddVectorInput } from './vector/vectorStore.js'

// Embedding exports
export {
  embedText,
  embedTexts,
  getEmbeddingModel,
  setEmbeddingModel,
  isRealEmbeddingConfigured,
  getModelInfo,
  EMBEDDING_DIMENSION
} from './embedding/embedder.js'
export type { EmbeddingConfig, EmbeddingModel } from './embedding/embedder.js'

// File indexer exports
export {
  indexProject,
  indexProjectByType,
  getFileCategories,
  defaultFileIndexerConfig
} from './indexer/fileIndexer.js'
export type { FileIndexerConfig } from './indexer/fileIndexer.js'

// Terminal indexer exports
export {
  indexTerminalHistory,
  setBlockStore,
  getBlockStore,
  addBlock,
  clearBlockStore,
  getTerminalStats,
  searchByCommand,
  getRecentBlocks,
  getFailedBlocks,
  defaultTerminalIndexerConfig
} from './indexer/terminalIndexer.js'
export type { TerminalBlock, TerminalIndexerConfig } from './indexer/terminalIndexer.js'

// Git indexer exports
export {
  indexGit,
  isGitRepo,
  getGitRoot,
  getBranches,
  getTags,
  getCommits,
  getCommitDiff,
  getStatus,
  getGitSummary,
  defaultGitIndexerConfig
} from './indexer/gitIndexer.js'
export type { GitCommit, GitBranch, GitTag, GitIndexerConfig } from './indexer/gitIndexer.js'

// Retrieval exports
export {
  searchContext,
  searchByType,
  searchFiles,
  searchTerminal,
  searchGit,
  getRecentContext,
  getContextByType,
  formatContextForPrompt,
  multiQuerySearch,
  defaultSearchConfig
} from './retrieval/search.js'
export type { ContextResult, SearchConfig } from './retrieval/search.js'

// Version
export const VERSION = '1.0.0'
