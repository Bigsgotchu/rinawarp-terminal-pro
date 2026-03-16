/**
 * Rina OS Control Layer - Personality Module
 *
 * Adaptive personality and mood management for Rina.
 * Responds based on conversation context and user patterns.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { getRecentMemory, remember, type MemoryRole } from './memory/session.js'

/**
 * Rina's mood states
 */
export type RinaMood = 'helpful' | 'curious' | 'playful'

/**
 * Context passed to message handlers
 */
export interface RinaPersonaContext {
  mood: RinaMood
  recent: Array<{ role: MemoryRole; message: string; timestamp: number }>
}

/**
 * Rina Persona - Adaptive personality with mood detection
 */
export class RinaPersona {
  private name = 'Rina'
  private mood: RinaMood = 'helpful'

  /**
   * Chat with Rina - main interaction method
   */
  async chat(message: string): Promise<{
    text: string
    mood: RinaMood
  }> {
    // Store user message
    remember('user', message)

    // Get context for response
    const context = this.getContext()

    // Generate response based on mood
    const response = this.generateResponse(message, context)

    // Store Rina's response
    remember('rina', response)

    return {
      text: response,
      mood: context.mood,
    }
  }

  /**
   * Adapt mood based on recent conversation
   */
  adaptMood(): void {
    const recent = getRecentMemory(10)
    const recentTexts = recent.map((m) => m.message.toLowerCase())

    // Check for playful patterns
    if (recentTexts.some((text) => /joke|funny|lol|haha|😂|😄/.test(text))) {
      this.mood = 'playful'
      return
    }

    // Check for curious patterns (questions)
    if (recentTexts.some((text) => /\?|how|why|what|when|where|explain/.test(text))) {
      this.mood = 'curious'
      return
    }

    // Default to helpful
    this.mood = 'helpful'
  }

  /**
   * Get current context including mood and recent messages
   */
  getContext(): RinaPersonaContext {
    this.adaptMood()
    const recentMem = getRecentMemory(20)

    return {
      mood: this.mood,
      recent: [...recentMem].map((m) => ({
        role: m.role,
        message: m.message,
        timestamp: m.timestamp,
      })),
    }
  }

  /**
   * Get Rina's name
   */
  getName(): string {
    return this.name
  }

  /**
   * Set mood explicitly
   */
  setMood(mood: RinaMood): void {
    this.mood = mood
  }

  /**
   * Generate a response based on mood
   */
  private generateResponse(message: string, context: RinaPersonaContext): string {
    const lowerMessage = message.toLowerCase()

    switch (context.mood) {
      case 'playful':
        return this.playfulResponse(lowerMessage)
      case 'curious':
        return this.curiousResponse(lowerMessage)
      case 'helpful':
      default:
        return this.helpfulResponse(lowerMessage)
    }
  }

  private playfulResponse(message: string): string {
    if (/\?$/.test(message)) {
      return `Haha, you're asking me things! 😄 I'm Rina, your playful assistant. What shall we do next?`
    }
    if (/hello|hi|hey/.test(message)) {
      return `Hey there! 🎉 Ready to have some fun while we work?`
    }
    return `Haha! "${message}" — that's awesome! 😄 What else can I help you with?`
  }

  private curiousResponse(message: string): string {
    if (/\?$/.test(message)) {
      return `Great question! 🤔 I'd love to explore that with you. Tell me more about what you're thinking?`
    }
    if (/hello|hi|hey/.test(message)) {
      return `Hi there! 👋 What's on your mind? I'm curious to hear what you'd like to do.`
    }
    return `Interesting! "${message}" — tell me more? 🤔 I'd love to understand better.`
  }

  private helpfulResponse(message: string): string {
    if (/\?$/.test(message)) {
      return `That's a good question! I'm here to help. Could you tell me more about what you need?`
    }
    if (/hello|hi|hey/.test(message)) {
      return `Hello! 👋 I'm Rina, here to help you with your tasks. What would you like to do?`
    }
    return `Got it! "${message}" — I can help you with that. Would you like me to execute any commands or just discuss it further?`
  }
}

// Singleton instance
export const rinaPersona = new RinaPersona()
