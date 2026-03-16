/**
 * RinaWarp Thinking Stream
 *
 * Captures and tracks AI reasoning steps in real-time.
 * Used by the Visual AI Brain Panel to display the reasoning flow.
 */

import { EventEmitter } from 'events'

export type ThoughtType =
  | 'intent' // User intent recognition
  | 'planning' // Task planning
  | 'reasoning' // Step-by-step reasoning
  | 'tool' // Tool selection/execution
  | 'memory' // Memory retrieval/storage
  | 'action' // Taking action
  | 'result' // Final result
  | 'error' // Error occurred

export interface Thought {
  id: string
  type: ThoughtType
  content: string
  timestamp: Date
  duration?: number // ms
  metadata?: Record<string, any>
  children?: Thought[] // Sub-thoughts
}

/**
 * Main thinking stream that captures AI reasoning
 */
export class ThinkingStream extends EventEmitter {
  private thoughts: Thought[] = []
  private maxThoughts = 100
  private idCounter = 0

  constructor() {
    super()
  }

  /**
   * Stream a thought (simple interface for quick logging)
   */
  stream(content: string): string {
    return this.start('reasoning', content)
  }

  /**
   * Start a new thought
   */
  start(type: ThoughtType, content: string, metadata?: Record<string, any>): string {
    const id = `thought-${++this.idCounter}`

    const thought: Thought = {
      id,
      type,
      content,
      timestamp: new Date(),
      metadata,
      children: [],
    }

    this.thoughts.push(thought)

    // Trim old thoughts
    if (this.thoughts.length > this.maxThoughts) {
      this.thoughts = this.thoughts.slice(-this.maxThoughts)
    }

    this.emit('thought:start', thought)
    return id
  }

  /**
   * Complete a thought
   */
  complete(id: string, result?: string): void {
    const thought = this.findThought(id)
    if (!thought) return

    thought.duration = Date.now() - thought.timestamp.getTime()
    if (result) {
      thought.content = result
    }

    this.emit('thought:complete', thought)
  }

  /**
   * Add a sub-thought (child)
   */
  addChild(parentId: string, type: ThoughtType, content: string): string {
    const parent = this.findThought(parentId)
    if (!parent) return ''

    const childId = `thought-${++this.idCounter}`
    const child: Thought = {
      id: childId,
      type,
      content,
      timestamp: new Date(),
      children: [],
    }

    parent.children = parent.children || []
    parent.children.push(child)

    this.emit('thought:child', { parent, child })
    return childId
  }

  /**
   * Add an error thought
   */
  error(content: string, metadata?: Record<string, any>): string {
    return this.start('error', content, metadata)
  }

  /**
   * Find a thought by ID
   */
  private findThought(id: string): Thought | undefined {
    return this.findThoughtRecursive(this.thoughts, id)
  }

  private findThoughtRecursive(thoughts: Thought[], id: string): Thought | undefined {
    for (const thought of thoughts) {
      if (thought.id === id) return thought
      if (thought.children) {
        const found = this.findThoughtRecursive(thought.children, id)
        if (found) return found
      }
    }
    return undefined
  }

  /**
   * Get all thoughts
   */
  getThoughts(): Thought[] {
    return [...this.thoughts]
  }

  /**
   * Get current (latest) thought chain
   */
  getCurrentChain(): Thought[] {
    if (this.thoughts.length === 0) return []

    const chain: Thought[] = []
    let current: Thought | undefined = this.thoughts[this.thoughts.length - 1]

    while (current) {
      chain.unshift(current)
      const children: Thought[] | undefined = current.children
      current = children && children.length > 0 ? children[children.length - 1] : undefined
    }

    return chain
  }

  /**
   * Clear all thoughts
   */
  clear(): void {
    this.thoughts = []
    this.emit('clear')
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number
    byType: Record<ThoughtType, number>
    avgDuration: number
  } {
    const byType: Record<ThoughtType, number> = {
      intent: 0,
      planning: 0,
      reasoning: 0,
      tool: 0,
      memory: 0,
      action: 0,
      result: 0,
      error: 0,
    }

    let totalDuration = 0
    let durationCount = 0

    this.countThoughts(this.thoughts, byType, (t) => {
      if (t.duration) {
        totalDuration += t.duration
        durationCount++
      }
    })

    return {
      total: this.thoughts.length,
      byType,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    }
  }

  private countThoughts(
    thoughts: Thought[],
    byType: Record<ThoughtType, number>,
    callback: (t: Thought) => void
  ): void {
    for (const thought of thoughts) {
      byType[thought.type]++
      callback(thought)
      if (thought.children) {
        this.countThoughts(thought.children, byType, callback)
      }
    }
  }
}

/**
 * Singleton instance
 */
export const thinkingStream = new ThinkingStream()

/**
 * Helper to create a thought and auto-complete it
 */
export async function withThought<T>(
  stream: ThinkingStream,
  type: ThoughtType,
  content: string,
  fn: () => Promise<T>
): Promise<T> {
  const id = stream.start(type, content)
  try {
    const result = await fn()
    stream.complete(id, String(result))
    return result
  } catch (error) {
    stream.error(`Error: ${error}`)
    throw error
  }
}
