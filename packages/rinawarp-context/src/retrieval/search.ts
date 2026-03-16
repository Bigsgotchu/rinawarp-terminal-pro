/**
 * Context Retrieval
 * 
 * Semantic search for retrieving relevant context from the vector store.
 */

import { embedText } from '../embedding/embedder.js'
import { searchVector, VectorDoc, SearchResult } from '../vector/vectorStore.js'

/**
 * Search result with additional metadata
 */
export interface ContextResult {
  doc: VectorDoc
  score: number
  type: string
  subType?: string
  summary: string
}

/**
 * Search configuration
 */
export interface SearchConfig {
  /** Number of results to return */
  topK: number
  /** Minimum score threshold (0-1) */
  minScore: number
  /** Filter by document types */
  types?: string[]
  /** Include metadata in results */
  includeMetadata: boolean
}

/**
 * Default search configuration
 */
export const defaultSearchConfig: SearchConfig = {
  topK: 5,
  minScore: 0.0,
  includeMetadata: true
}

/**
 * Search context using semantic search
 * 
 * @param query - The search query
 * @param config - Optional search configuration
 * @returns Promise resolving to search results
 */
export async function searchContext(
  query: string,
  config: Partial<SearchConfig> = {}
): Promise<ContextResult[]> {
  const cfg = { ...defaultSearchConfig, ...config }
  
  // Generate embedding for query
  const embedding = await embedText(query)
  
  // Search vector store
  const results = searchVector(embedding, cfg.topK * 2) // Get more to filter
  
  // Filter and transform results
  const contextResults: ContextResult[] = []
  
  for (const result of results) {
    // Filter by type if specified
    if (cfg.types && cfg.types.length > 0) {
      const docType = result.doc.metadata?.type as string
      if (!cfg.types.includes(docType)) {
        continue
      }
    }
    
    // Filter by minimum score
    if (result.score < cfg.minScore) {
      continue
    }
    
    // Create summary
    const summary = createSummary(result.doc)
    
    contextResults.push({
      doc: cfg.includeMetadata ? result.doc : {
        ...result.doc,
        metadata: undefined
      },
      score: result.score,
      type: result.doc.metadata?.type as string || 'unknown',
      subType: result.doc.metadata?.subType as string | undefined,
      summary
    })
    
    // Stop if we have enough results
    if (contextResults.length >= cfg.topK) {
      break
    }
  }
  
  return contextResults
}

/**
 * Create a summary of a document
 */
function createSummary(doc: VectorDoc): string {
  const type = doc.metadata?.type as string || 'unknown'
  const maxLength = 200
  
  let summary = ''
  
  switch (type) {
    case 'file':
      const path = doc.metadata?.path as string
      summary = `File: ${path}`
      break
      
    case 'terminal':
      const command = doc.metadata?.command as string
      summary = `Command: ${command}`
      break
      
    case 'git':
      const subType = doc.metadata?.subType as string
      if (subType === 'commit') {
        const message = doc.metadata?.message as string
        const shortHash = doc.metadata?.shortHash as string
        summary = `Commit ${shortHash}: ${message}`
      } else if (subType === 'branch') {
        const name = doc.metadata?.name as string
        summary = `Branch: ${name}`
      } else if (subType === 'status') {
        const branch = doc.metadata?.branch as string
        summary = `Status on branch: ${branch}`
      } else {
        summary = `Git: ${subType}`
      }
      break
      
    default:
      summary = doc.text.slice(0, maxLength)
  }
  
  return summary
}

/**
 * Search by specific type
 */
export async function searchByType(
  query: string,
  type: 'file' | 'terminal' | 'git',
  topK: number = 5
): Promise<ContextResult[]> {
  return searchContext(query, {
    topK,
    types: [type]
  })
}

/**
 * Search files only
 */
export async function searchFiles(
  query: string,
  topK: number = 5
): Promise<ContextResult[]> {
  return searchByType(query, 'file', topK)
}

/**
 * Search terminal history only
 */
export async function searchTerminal(
  query: string,
  topK: number = 5
): Promise<ContextResult[]> {
  return searchByType(query, 'terminal', topK)
}

/**
 * Search git information only
 */
export async function searchGit(
  query: string,
  topK: number = 5
): Promise<ContextResult[]> {
  return searchByType(query, 'git', topK)
}

/**
 * Get recent context
 */
export function getRecentContext(count: number = 10): VectorDoc[] {
  const { getAllVectors } = require('../vector/vectorStore.js')
  const all = getAllVectors()
  
  // Return most recently added (assumes order)
  return all.slice(-count)
}

/**
 * Get context by type
 */
export function getContextByType(type: string): VectorDoc[] {
  const { getVectorsByMetadata } = require('../vector/vectorStore.js')
  return getVectorsByMetadata('type', type)
}

/**
 * Format context for AI prompts
 */
export function formatContextForPrompt(results: ContextResult[]): string {
  if (results.length === 0) {
    return 'No relevant context found.'
  }
  
  let formatted = '## Relevant Context\n\n'
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    formatted += `### ${i + 1}. ${result.type}${result.subType ? ` (${result.subType})` : ''}\n`
    formatted += `Relevance: ${(result.score * 100).toFixed(1)}%\n\n`
    formatted += result.doc.text.slice(0, 1000)
    
    if (result.doc.text.length > 1000) {
      formatted += '\n...'
    }
    
    formatted += '\n\n---\n\n'
  }
  
  return formatted
}

/**
 * Multi-query search
 * 
 * Run multiple searches and combine results
 */
export async function multiQuerySearch(
  queries: string[],
  config: Partial<SearchConfig> = {}
): Promise<ContextResult[]> {
  const allResults: ContextResult[] = []
  
  for (const query of queries) {
    const results = await searchContext(query, config)
    allResults.push(...results)
  }
  
  // Deduplicate by ID and sort by score
  const seen = new Set<string>()
  const uniqueResults: ContextResult[] = []
  
  for (const result of allResults) {
    if (!seen.has(result.doc.id)) {
      seen.add(result.doc.id)
      uniqueResults.push(result)
    }
  }
  
  uniqueResults.sort((a, b) => b.score - a.score)
  
  const cfg = { ...defaultSearchConfig, ...config }
  return uniqueResults.slice(0, cfg.topK)
}
