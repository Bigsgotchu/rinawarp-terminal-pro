/**
 * RinaWarp AI Code Refactor Agent
 *
 * Automatically improves code quality using LLM.
 * Users can trigger with: "rina refactor this file"
 */

import * as fs from 'fs'
import * as path from 'path'
import { brainEvents } from '../brain/brainEvents.js'

// LLM client placeholder - would be replaced with actual implementation
// import { openai } from '../ai/client.js';

/**
 * Refactor options
 */
export interface RefactorOptions {
  style?: 'modern' | 'functional' | 'oop' | 'clean'
  target?: string // specific file or directory
  dryRun?: boolean
}

/**
 * Refactor result
 */
export interface RefactorResult {
  success: boolean
  filesProcessed: number
  improvements: string[]
  errors: string[]
}

/**
 * AI Code Refactor Agent
 */
export class RefactorAgent {
  name = 'refactor'
  description = 'AI-powered code refactoring agent'

  /**
   * Analyze and suggest improvements for a file
   */
  async analyze(filePath: string): Promise<{
    suggestions: string[]
    complexity: number
  }> {
    brainEvents.execution(`Analyzing ${path.basename(filePath)}`)

    const code = fs.readFileSync(filePath, 'utf-8')

    // In production, this would call LLM
    // For now, return basic analysis
    const suggestions: string[] = []

    // Simple heuristics
    if (code.length > 500) {
      suggestions.push('File is large, consider splitting into modules')
    }
    if (code.includes('var ')) {
      suggestions.push('Use const/let instead of var')
    }
    if (code.includes('function ') && !code.includes('=>')) {
      suggestions.push('Consider using arrow functions')
    }

    const complexity = this.calculateComplexity(code)

    return { suggestions, complexity }
  }

  /**
   * Refactor a single file
   */
  async refactorFile(
    filePath: string,
    options: RefactorOptions = {}
  ): Promise<{ success: boolean; improved: string; message: string }> {
    brainEvents.plan('Starting code refactoring')

    if (!fs.existsSync(filePath)) {
      brainEvents.error(`File not found: ${filePath}`)
      return { success: false, improved: '', message: 'File not found' }
    }

    const code = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath)

    brainEvents.execution(`Reading ${path.basename(filePath)}`, 20)

    // In production, this would call LLM with a refactoring prompt
    // For demo, apply basic transformations
    let improved = code

    // Basic transformations (demo purposes)
    improved = this.applyBasicRefactoring(improved)

    brainEvents.execution('Applying improvements', 70)

    if (!options.dryRun) {
      const backupPath = filePath + '.bak'
      fs.writeFileSync(backupPath, code)
      brainEvents.memory(`Created backup: ${path.basename(backupPath)}`)

      fs.writeFileSync(filePath, improved)
      brainEvents.memory(`Saved refactored file`)
    }

    brainEvents.result(`Refactored ${path.basename(filePath)}`)

    return {
      success: true,
      improved,
      message: 'Code refactored successfully',
    }
  }

  /**
   * Refactor multiple files
   */
  async refactorDirectory(dirPath: string, options: RefactorOptions = {}): Promise<RefactorResult> {
    brainEvents.plan(`Scanning directory: ${dirPath}`)

    const result: RefactorResult = {
      success: true,
      filesProcessed: 0,
      improvements: [],
      errors: [],
    }

    if (!fs.existsSync(dirPath)) {
      result.success = false
      result.errors.push('Directory not found')
      return result
    }

    const files = this.findCodeFiles(dirPath)
    brainEvents.memory(`Found ${files.length} files to refactor`)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const progress = Math.round((i / files.length) * 100)

      brainEvents.execution(`Refactoring ${path.basename(file)}`, progress)

      try {
        const refactorResult = await this.refactorFile(file, options)
        if (refactorResult.success) {
          result.filesProcessed++
          result.improvements.push(path.basename(file))
        }
      } catch (error) {
        result.errors.push(`${path.basename(file)}: ${error}`)
      }
    }

    brainEvents.result(`Processed ${result.filesProcessed} files`)

    return result
  }

  /**
   * Apply basic refactoring transformations
   */
  private applyBasicRefactoring(code: string): string {
    let result = code

    // Replace var with const/let
    result = result.replace(/\bvar\s+(\w+)/g, 'const $1')

    // Add space after // comments
    result = result.replace(/\/\/(\S)/g, '// $1')

    // Remove trailing whitespace
    result = result
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')

    return result
  }

  /**
   * Calculate code complexity (simple heuristic)
   */
  private calculateComplexity(code: string): number {
    let score = 0

    // Count control structures
    score += (code.match(/\bif\b/g) || []).length * 2
    score += (code.match(/\bfor\b/g) || []).length * 3
    score += (code.match(/\bwhile\b/g) || []).length * 3
    score += (code.match(/\bswitch\b/g) || []).length * 4
    score += (code.match(/\bcatch\b/g) || []).length * 2

    return Math.min(100, score)
  }

  /**
   * Find code files in directory
   */
  private findCodeFiles(dir: string): string[] {
    const files: string[] = []
    const exts = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs']

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(full)
        } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
          files.push(full)
        }
      }
    }

    walk(dir)
    return files
  }

  /**
   * Execute refactor command
   */
  async execute(input: string): Promise<string> {
    // Parse command
    if (input.includes('refactor')) {
      brainEvents.intent('Code refactoring requested')

      // Extract target
      const target = input.replace(/rina\s+refactor\s*/i, '').trim() || '.'

      brainEvents.plan('Analyzing target')

      const stats = fs.statSync(target)

      if (stats.isFile()) {
        const result = await this.refactorFile(target)
        return result.message
      } else if (stats.isDirectory()) {
        const result = await this.refactorDirectory(target)
        return `Refactored ${result.filesProcessed} files`
      }
    }

    return 'Unknown refactor command'
  }
}

/**
 * Singleton instance
 */
export const refactorAgent = new RefactorAgent()
