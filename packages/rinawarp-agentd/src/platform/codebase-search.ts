/**
 * Codebase Search
 *
 * Problem #9: Codebase Search
 * "where is auth middleware" → ripgrep + AI understanding
 *
 * Uses ripgrep for searching + LLM for understanding results.
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { generateFixPlan } from './llm.js'
import type { LLMConfig } from './llm.js'

const execAsync = promisify(exec)

export interface SearchResult {
  file: string
  line: number
  content: string
  match: string
  context?: string[]
}

export interface CodeSearchResult {
  query: string
  results: SearchResult[]
  summary: string
  suggestedFiles?: string[]
}

/**
 * Search codebase for pattern
 */
export async function searchCodebase(
  config: LLMConfig,
  cwd: string,
  query: string,
  options?: {
    filePattern?: string
    limit?: number
    includePatterns?: string[]
    excludePatterns?: string[]
  }
): Promise<CodeSearchResult> {
  const {
    filePattern = '*.{ts,js,tsx,jsx,py,go,rs,java}',
    limit = 50,
    excludePatterns = ['node_modules', '.git', 'dist', 'build', '__pycache__'],
  } = options || {}

  // Try semantic search first using LLM
  const semanticResults = await semanticSearch(config, cwd, query)

  if (semanticResults.length > 0) {
    return {
      query,
      results: semanticResults.slice(0, limit),
      summary: `Found ${semanticResults.length} matches for "${query}"`,
      suggestedFiles: [...new Set(semanticResults.map((r) => r.file))].slice(0, 10),
    }
  }

  // Fall back to ripgrep
  const grepResults = await grepSearch(cwd, query, {
    filePattern,
    limit,
    excludePatterns,
  })

  return {
    query,
    results: grepResults,
    summary: `Found ${grepResults.length} matches for "${query}"`,
    suggestedFiles: [...new Set(grepResults.map((r) => r.file))].slice(0, 10),
  }
}

/**
 * Semantic search using LLM to understand the codebase
 */
async function semanticSearch(config: LLMConfig, cwd: string, query: string): Promise<SearchResult[]> {
  // First, find relevant files by extension
  const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs']
  const files: string[] = []

  for (const ext of extensions) {
    try {
      const { stdout } = await execAsync(`find . -name "*${ext}" -type f 2>/dev/null | head -100`, { cwd })
      files.push(...stdout.split('\n').filter(Boolean))
    } catch {
      /* ignore */
    }
  }

  // Use LLM to find relevant files
  const prompt = `Given this codebase query: "${query}"

Available files (first 50):
${files.slice(0, 50).join('\n')}

Which files are most likely to contain the answer? 

Respond with ONLY a JSON array of file paths (max 10):
["src/auth.ts", "middleware/auth.js"]`

  try {
    const result = await generateFixPlan(
      config,
      {
        userPrompt: query,
        systemContext: {
          os: 'linux',
          kernel: '',
          hostname: '',
          uptime: '',
          cpu: '',
          memory: '',
          disk: '',
          processes: '',
          services: '',
        },
      },
      {
        systemPrompt: prompt,
        maxRetries: 1,
      }
    )

    // Parse the file paths from the result
    const results: SearchResult[] = []

    for (const cmd of result.commands) {
      // Try grep on each suggested file
      try {
        const grepResult = await execAsync(`grep -n "${query}" ${cmd} 2>/dev/null || true`, { cwd })

        for (const line of grepResult.stdout.split('\n').filter(Boolean)) {
          const match = line.match(/^(.+?):(\d+):(.*)$/)
          if (match) {
            results.push({
              file: path.resolve(cwd, match[1]),
              line: parseInt(match[2], 10),
              content: match[3],
              match: query,
            })
          }
        }
      } catch {
        /* ignore */
      }
    }

    return results
  } catch {
    return []
  }
}

/**
 * Traditional grep search
 */
async function grepSearch(
  cwd: string,
  query: string,
  options: {
    filePattern: string
    limit: number
    excludePatterns: string[]
  }
): Promise<SearchResult[]> {
  const excludeArgs = options.excludePatterns.map((p) => `--exclude-dir=${p} --exclude=${p}`).join(' ')

  try {
    const { stdout } = await execAsync(
      `grep -rn "${query}" --include="${options.filePattern}" ${excludeArgs} . 2>/dev/null | head ${options.limit}`,
      { cwd }
    )

    const results: SearchResult[] = []

    for (const line of stdout.split('\n').filter(Boolean)) {
      const match = line.match(/^(.+?):(\d+):(.*)$/)
      if (match) {
        results.push({
          file: path.resolve(cwd, match[1]),
          line: parseInt(match[2], 10),
          content: match[3],
          match: query,
        })
      }
    }

    return results
  } catch {
    return []
  }
}

/**
 * Find files by name pattern
 */
export async function findFiles(cwd: string, pattern: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`find . -name "${pattern}" -type f 2>/dev/null | head -50`, { cwd })

    return stdout.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get file preview with context
 */
export async function getFilePreview(filePath: string, lineNumber: number, contextLines: number = 3): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    const start = Math.max(0, lineNumber - contextLines - 1)
    const end = Math.min(lines.length, lineNumber + contextLines)

    const preview: string[] = []

    for (let i = start; i < end; i++) {
      const prefix = i === lineNumber - 1 ? '>>> ' : '    '
      preview.push(`${prefix}${i + 1}: ${lines[i]}`)
    }

    return preview.join('\n')
  } catch {
    return 'Could not read file'
  }
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.'
  }

  const lines: string[] = [`Found ${results.length} results:\n`]

  // Group by file
  const byFile = new Map<string, SearchResult[]>()
  for (const result of results) {
    const existing = byFile.get(result.file) || []
    existing.push(result)
    byFile.set(result.file, existing)
  }

  for (const [file, fileResults] of byFile) {
    lines.push(`\n📁 ${file}`)
    for (const result of fileResults.slice(0, 5)) {
      lines.push(`   ${result.line}: ${result.content.slice(0, 80)}`)
    }
    if (fileResults.length > 5) {
      lines.push(`   ... and ${fileResults.length - 5} more`)
    }
  }

  return lines.join('\n')
}
