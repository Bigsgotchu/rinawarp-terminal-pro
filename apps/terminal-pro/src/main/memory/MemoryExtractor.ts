import type { ExtractMemoryInput, MemorySuggestion } from './memoryTypes.js'

export interface MemoryExtractor {
  extract(input: ExtractMemoryInput): Promise<MemorySuggestion[]>
}
