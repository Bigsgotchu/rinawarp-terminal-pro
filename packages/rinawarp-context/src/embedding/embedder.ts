/**
 * Embedding Engine
 * 
 * Text embedding generation for semantic search.
 * Currently uses a simple hash-based placeholder embedding.
 * 
 * Later can be upgraded to:
 * - Ollama embeddings (local)
 * - Transformers.js (browser-compatible)
 * - OpenAI embeddings API
 * - Anthropic embeddings
 * - Cohere embeddings
 */

import { normalizeVector } from '../vector/vectorStore.js'

/**
 * Embedding dimension (default for many embedding models)
 */
export const EMBEDDING_DIMENSION = 384

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  dimension: number
  normalize: boolean
  model?: string
}

/**
 * Default embedding configuration
 */
const defaultConfig: EmbeddingConfig = {
  dimension: EMBEDDING_DIMENSION,
  normalize: true
}

/**
 * Generate a simple hash-based embedding for text
 * This is a placeholder implementation for development/testing
 * 
 * The approach:
 * 1. Convert characters to numerical values
 * 2. Use character codes to seed the embedding vector
 * 3. Apply a simple hashing function to distribute values
 * 4. Normalize the resulting vector
 */
function simpleHashEmbedding(text: string, dimension: number): number[] {
  const vec = new Array(dimension).fill(0)
  
  // Process text into the vector
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const position = i % dimension
    
    // Add some variation based on character
    vec[position] += charCode
    
    // Also add to a secondary position for more distribution
    const secondaryPos = (charCode + i) % dimension
    vec[secondaryPos] += charCode / 2
  }
  
  // Apply a simple "hash" to create more spread
  for (let i = 0; i < dimension; i++) {
    // Use a simple trigonometric transformation
    vec[i] = Math.sin(vec[i] / 10) * Math.cos(vec[i] / 10) * 100
  }
  
  return vec
}

/**
 * Generate word-based embedding
 * This is a slightly better placeholder that considers word boundaries
 */
function wordBasedEmbedding(text: string, dimension: number): number[] {
  const vec = new Array(dimension).fill(0)
  const words = text.toLowerCase().split(/\s+/)
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j)
      const position = (i + j + charCode) % dimension
      vec[position] += charCode
    }
  }
  
  // Normalize
  return normalizeVector(vec)
}

/**
 * Generate an embedding for the given text
 * 
 * @param text - The text to embed
 * @param config - Optional configuration
 * @returns Promise resolving to embedding vector
 */
export async function embedText(
  text: string,
  config: Partial<EmbeddingConfig> = {}
): Promise<number[]> {
  const { dimension, normalize: shouldNormalize } = { ...defaultConfig, ...config }
  
  if (!text || text.trim().length === 0) {
    return new Array(dimension).fill(0)
  }
  
  // Use word-based embedding for better distribution
  let embedding = wordBasedEmbedding(text, dimension)
  
  if (shouldNormalize) {
    embedding = normalizeVector(embedding)
  }
  
  return embedding
}

/**
 * Generate embeddings for multiple texts
 * 
 * @param texts - Array of texts to embed
 * @param config - Optional configuration
 * @returns Promise resolving to array of embedding vectors
 */
export async function embedTexts(
  texts: string[],
  config: Partial<EmbeddingConfig> = {}
): Promise<number[][]> {
  return Promise.all(texts.map(text => embedText(text, config)))
}

/**
 * Set the embedding model to use
 * This allows for future extensibility
 */
export type EmbeddingModel = 'placeholder' | 'ollama' | 'openai' | 'transformersjs'

let currentModel: EmbeddingModel = 'placeholder'

/**
 * Get the current embedding model
 */
export function getEmbeddingModel(): EmbeddingModel {
  return currentModel
}

/**
 * Set the embedding model to use
 * 
 * @param model - The embedding model to use
 */
export function setEmbeddingModel(model: EmbeddingModel): void {
  currentModel = model
}

/**
 * Check if a real embedding model is configured
 */
export function isRealEmbeddingConfigured(): boolean {
  return currentModel !== 'placeholder'
}

/**
 * Get model information
 */
export function getModelInfo(): { model: EmbeddingModel; dimension: number; description: string } {
  const descriptions: Record<EmbeddingModel, string> = {
    placeholder: 'Simple hash-based embedding (development only)',
    ollama: 'Local Ollama embeddings model',
    openai: 'OpenAI text-embedding-3 model',
    transformersjs: 'Browser-compatible Transformers.js'
  }
  
  return {
    model: currentModel,
    dimension: defaultConfig.dimension,
    description: descriptions[currentModel]
  }
}
