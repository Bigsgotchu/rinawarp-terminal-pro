/**
 * Vector Store
 * 
 * Simple in-memory vector database for semantic search.
 * Stores document embeddings and supports cosine similarity search.
 * 
 * Later can be upgraded to:
 * - Pinecone
 * - Weaviate
 * - Chroma
 * - Qdrant
 */

import { randomUUID } from 'crypto'

/**
 * Vector document type
 */
export type VectorDoc = {
  id: string
  text: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

/**
 * Search result with score
 */
export type SearchResult = {
  doc: VectorDoc
  score: number
}

/**
 * In-memory vector store
 */
const store: VectorDoc[] = []

/**
 * Compute cosine similarity between two vectors
 */
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] ** 2
    normB += b[i] ** 2
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) {
    return 0
  }

  return dot / denominator
}

export type AddVectorInput = {
  id?: string
  text: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

/**
 * Add a vector document to the store
 */
export function addVector(doc: AddVectorInput): VectorDoc {
  const newDoc: VectorDoc = {
    id: doc.id || randomUUID(),
    ...doc
  }
  store.push(newDoc)
  return newDoc
}

/**
 * Add multiple vector documents to the store
 */
export function addVectors(docs: AddVectorInput[]): VectorDoc[] {
  return docs.map(doc => addVector(doc))
}

/**
 * Search for similar documents using cosine similarity
 */
export function searchVector(query: number[], topK = 5): SearchResult[] {
  if (store.length === 0) {
    return []
  }

  const results = store
    .map(doc => ({
      doc,
      score: cosine(query, doc.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return results
}

/**
 * Get a document by ID
 */
export function getVector(id: string): VectorDoc | undefined {
  return store.find(doc => doc.id === id)
}

/**
 * Get all documents in the store
 */
export function getAllVectors(): VectorDoc[] {
  return [...store]
}

/**
 * Delete a document by ID
 */
export function deleteVector(id: string): boolean {
  const index = store.findIndex(doc => doc.id === id)
  if (index === -1) {
    return false
  }
  store.splice(index, 1)
  return true
}

/**
 * Clear all documents from the store
 */
export function clearStore(): void {
  store.length = 0
}

/**
 * Get the number of documents in the store
 */
export function getStoreSize(): number {
  return store.length
}

/**
 * Get documents by metadata filter
 */
export function getVectorsByMetadata(key: string, value: unknown): VectorDoc[] {
  return store.filter(doc => doc.metadata?.[key] === value)
}

/**
 * Compute Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2
  }
  return Math.sqrt(sum)
}

/**
 * Compute dot product between two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val ** 2, 0))
  if (magnitude === 0) {
    return vec
  }
  return vec.map(val => val / magnitude)
}
