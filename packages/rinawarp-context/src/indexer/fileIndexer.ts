/**
 * File Indexer
 * 
 * Indexes project files for semantic search.
 * Walks the directory tree and indexes file contents.
 */

import fs from 'fs'
import path from 'path'
import { embedText, EMBEDDING_DIMENSION } from '../embedding/embedder.js'
import { addVector, VectorDoc } from '../vector/vectorStore.js'

/**
 * File indexer configuration
 */
export interface FileIndexerConfig {
  /** Maximum file size to index (in bytes) */
  maxFileSize: number
  /** File extensions to include */
  includeExtensions: string[]
  /** Directories to exclude */
  excludeDirs: string[]
  /** Files to exclude by name */
  excludeFiles: string[]
  /** Maximum text length per file */
  maxTextLength: number
  /** Show progress logging */
  verbose: boolean
}

/**
 * Default file indexer configuration
 */
export const defaultFileIndexerConfig: FileIndexerConfig = {
  maxFileSize: 1024 * 1024, // 1MB
  includeExtensions: [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
    '.html', '.css', '.scss', '.less',
    '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
    '.yml', '.yaml', '.toml', '.ini', '.conf', '.config',
    '.sh', '.bash', '.zsh', '.ps1',
    '.sql', '.graphql', '.gql'
  ],
  excludeDirs: [
    'node_modules', '.git', 'dist', 'build', 'out',
    '.next', '.nuxt', '.svelte', 'coverage', '.nyc_output',
    '__pycache__', '.pytest_cache', 'venv', '.venv',
    '.cache', '.parcel-cache', '.webpack'
  ],
  excludeFiles: [
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', '.gitignore',
    '*.min.js', '*.min.css', '*.map'
  ],
  maxTextLength: 10000,
  verbose: false
}

/**
 * Index a project directory
 * 
 * @param root - Root directory to index
 * @param config - Optional configuration
 * @returns Promise resolving to indexed document count
 */
export async function indexProject(
  root: string,
  config: Partial<FileIndexerConfig> = {}
): Promise<number> {
  const cfg = { ...defaultFileIndexerConfig, ...config }
  const mergedConfig = { ...defaultFileIndexerConfig, ...config }
  
  if (cfg.verbose) {
    console.log(`[FileIndexer] Starting indexing of: ${root}`)
  }
  
  // Validate root directory
  if (!fs.existsSync(root)) {
    throw new Error(`Directory does not exist: ${root}`)
  }
  
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Path is not a directory: ${root}`)
  }
  
  // Walk directory and collect files
  const files = walkDir(root, cfg)
  
  if (cfg.verbose) {
    console.log(`[FileIndexer] Found ${files.length} files to index`)
  }
  
  let indexedCount = 0
  
  // Index each file
  for (const file of files) {
    try {
      await indexFile(file, mergedConfig)
      indexedCount++
      
      if (cfg.verbose && indexedCount % 50 === 0) {
        console.log(`[FileIndexer] Indexed ${indexedCount}/${files.length} files`)
      }
    } catch (error) {
      if (cfg.verbose) {
        console.warn(`[FileIndexer] Failed to index ${file}:`, error)
      }
    }
  }
  
  if (cfg.verbose) {
    console.log(`[FileIndexer] Completed. Indexed ${indexedCount} files`)
  }
  
  return indexedCount
}

/**
 * Index a single file
 */
async function indexFile(filePath: string, config: FileIndexerConfig): Promise<VectorDoc | null> {
  // Check file size
  const stats = fs.statSync(filePath)
  if (stats.size > config.maxFileSize) {
    return null
  }
  
  // Check extension
  const ext = path.extname(filePath).toLowerCase()
  if (!config.includeExtensions.includes(ext)) {
    return null
  }
  
  // Read file content
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    // Binary file or read error
    return null
  }
  
  // Truncate if too long
  if (content.length > config.maxTextLength) {
    content = content.slice(0, config.maxTextLength)
  }
  
  // Skip empty files
  if (!content.trim()) {
    return null
  }
  
  // Generate embedding
  const embedding = await embedText(content)
  
  // Add to vector store
  const doc = addVector({
    id: filePath,
    text: content,
    embedding,
    metadata: {
      type: 'file',
      path: filePath,
      name: path.basename(filePath),
      extension: ext,
      size: stats.size,
      modified: stats.mtime.toISOString()
    }
  })
  
  return doc
}

/**
 * Walk directory tree and return list of files
 */
function walkDir(dir: string, config: FileIndexerConfig): string[] {
  const results: string[] = []
  
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      // Skip excluded directories
      if (config.excludeDirs.includes(entry.name)) {
        continue
      }
      
      // Skip hidden directories (except .gitkeep, etc.)
      if (entry.name.startsWith('.') && !entry.name.startsWith('.git')) {
        continue
      }
      
      // Recurse
      results.push(...walkDir(fullPath, config))
    } else if (entry.isFile()) {
      // Skip excluded files
      if (shouldExcludeFile(entry.name, config)) {
        continue
      }
      
      results.push(fullPath)
    }
  }
  
  return results
}

/**
 * Check if a file should be excluded
 */
function shouldExcludeFile(filename: string, config: FileIndexerConfig): boolean {
  // Check exact matches
  if (config.excludeFiles.includes(filename)) {
    return true
  }
  
  // Check glob patterns
  for (const pattern of config.excludeFiles) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      if (regex.test(filename)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get file extension categories
 */
export function getFileCategories(): Record<string, string[]> {
  return {
    code: ['.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp'],
    config: ['.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config'],
    docs: ['.md', '.txt', '.rst'],
    styles: ['.css', '.scss', '.less', '.sass'],
    scripts: ['.sh', '.bash', '.zsh', '.ps1'],
    data: ['.sql', '.graphql', '.gql']
  }
}

/**
 * Index only specific file types
 */
export async function indexProjectByType(
  root: string,
  types: string[],
  config: Partial<FileIndexerConfig> = {}
): Promise<number> {
  const categories = getFileCategories()
  const extensions = types.flatMap(type => categories[type] || [type])
  
  const cfg: FileIndexerConfig = {
    ...defaultFileIndexerConfig,
    ...config,
    includeExtensions: extensions
  }
  
  return indexProject(root, cfg)
}
