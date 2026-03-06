/**
 * Code Index
 * 
 * Embedding-based code search for context-aware suggestions.
 * 
 * This is a simplified implementation - production would use
 * FAISS, Pinecone, or Weaviate for vector search.
 */

export interface CodeEntry {
  path: string;
  content: string;
  type: "file" | "directory" | "function" | "class";
  name: string;
}

export interface SearchResult {
  entry: CodeEntry;
  score: number;
}

export interface CodeIndex {
  entries: Map<string, CodeEntry>;
}

/**
 * Create a new code index
 */
export function createIndex(): CodeIndex {
  return { entries: new Map() };
}

/**
 * Add entries to index
 */
export function indexCode(index: CodeIndex, entries: CodeEntry[]): void {
  for (const entry of entries) {
    // Index by path and name for quick lookup
    index.entries.set(entry.path, entry);
    
    // Also index by name for fuzzy search
    if (entry.name) {
      index.entries.set(entry.name, entry);
    }
  }
}

/**
 * Search code index
 */
export function searchCode(index: CodeIndex, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  for (const entry of index.entries.values()) {
    let score = 0;
    
    // Exact path match
    if (entry.path.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Name match
    if (entry.name.toLowerCase().includes(queryLower)) {
      score += 20;
    }
    
    // Content match
    if (entry.content.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Function/class match
    if (entry.type === "function" || entry.type === "class") {
      if (entry.name.toLowerCase() === queryLower) {
        score += 30;
      }
    }
    
    if (score > 0) {
      results.push({ entry, score });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, 10);
}

/**
 * Index files from directory
 */
export async function indexDirectory(
  dirPath: string,
  options: {
    extensions?: string[];
    excludeDirs?: string[];
  } = {}
): Promise<CodeEntry[]> {
  const { 
    extensions = [".ts", ".js", ".tsx", ".jsx", ".py", ".rs", ".go"], 
    excludeDirs = ["node_modules", ".git", "dist", "build", "target"] 
  } = options;
  
  // This is a simplified implementation
  // Production would use fs.walk or similar
  const entries: CodeEntry[] = [];
  
  // Get file list (stub - would recursively scan)
  // In production: use fs.walk or glob
  
  return entries;
}

/**
 * Find code by pattern
 */
export function findByPattern(
  index: CodeIndex,
  pattern: RegExp
): SearchResult[] {
  const results: SearchResult[] = [];
  
  for (const entry of index.entries.values()) {
    if (pattern.test(entry.path) || pattern.test(entry.content)) {
      results.push({ entry, score: 5 });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get context around a match
 */
export function getContext(
  content: string,
  query: string,
  contextLines: number = 3
): string {
  const lines = content.split("\n");
  const queryLower = query.toLowerCase();
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length, i + contextLines + 1);
      
      return lines.slice(start, end).join("\n");
    }
  }
  
  return content.slice(0, 500); // Return first 500 chars
}

/**
 * Generate simple embeddings (stub)
 * 
 * Production would use:
 * - OpenAI text-embedding-3-small
 * - or local embeddings model
 */
export async function generateEmbedding(_text: string): Promise<number[]> {
  // Stub - returns random vector
  // Production: call embedding API
  return Array(1536).fill(0).map(() => Math.random());
}

/**
 * Find similar code using embeddings (stub)
 */
export async function findSimilar(
  _index: CodeIndex,
  _query: string,
  _topK: number = 5
): Promise<SearchResult[]> {
  // Stub implementation
  // Production: compute embeddings and use vector similarity
  return [];
}
