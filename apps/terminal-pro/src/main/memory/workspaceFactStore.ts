import {
  WorkspaceFact,
  WorkspaceFactCategory,
  WorkspaceFactConfidence,
  WorkspaceFactSource,
} from "./memoryTypes.js";

export type WorkspaceFactFilter = {
  category?: WorkspaceFactCategory;
  source?: WorkspaceFactSource;
  confidence?: WorkspaceFactConfidence;
  keyPrefix?: string;
};

export interface WorkspaceFactStore {
  upsertFact(fact: WorkspaceFact): Promise<WorkspaceFact>;
  getFact(id: string): Promise<WorkspaceFact | null>;
  listFacts(filter?: WorkspaceFactFilter): Promise<WorkspaceFact[]>;
  deleteFact(id: string): Promise<boolean>;
  findFactByKey(key: string): Promise<WorkspaceFact | null>;
}

type MemoryStoreState = {
  facts: Map<string, WorkspaceFact>;
};

let memoryStoreInstance: MemoryStoreState | null = null;

export function createMemoryWorkspaceFactStore(): WorkspaceFactStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = { facts: new Map() };
  }

  const state = memoryStoreInstance;

  return {
    async upsertFact(fact: WorkspaceFact): Promise<WorkspaceFact> {
      state.facts.set(fact.id, { ...fact });
      return { ...fact };
    },

    async getFact(id: string): Promise<WorkspaceFact | null> {
      const fact = state.facts.get(id);
      return fact ? { ...fact } : null;
    },

    async listFacts(filter?: WorkspaceFactFilter): Promise<WorkspaceFact[]> {
      let facts = Array.from(state.facts.values()).map((f) => ({ ...f }));

      if (filter) {
        if (filter.category) {
          facts = facts.filter((f) => f.category === filter.category);
        }
        if (filter.source) {
          facts = facts.filter((f) => f.source === filter.source);
        }
        if (filter.confidence) {
          facts = facts.filter((f) => f.confidence === filter.confidence);
        }
        if (filter.keyPrefix) {
          facts = facts.filter((f) => f.key.startsWith(filter.keyPrefix!));
        }
      }

      return facts;
    },

    async deleteFact(id: string): Promise<boolean> {
      return state.facts.delete(id);
    },

    async findFactByKey(key: string): Promise<WorkspaceFact | null> {
      const facts = await this.listFacts({ keyPrefix: key });
      if (facts.length === 0) return null;
      // Return first match (there should typically be only one)
      return facts[0];
    },
  };
}

export function resetMemoryWorkspaceFactStore(): void {
  memoryStoreInstance = null;
}