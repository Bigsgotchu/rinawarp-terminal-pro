import type { WorkspaceFact, WorkspaceFactCategory } from "./memoryTypes.js";
import type { WorkspaceFactStore } from "./workspaceFactStore.js";

export interface WorkspaceKnowledgeSnapshot {
  architecture: WorkspaceFact[];
  dependencies: WorkspaceFact[];
  conventions: WorkspaceFact[];
  preferences: WorkspaceFact[];
  recurring_failures: WorkspaceFact[];
  runtime_facts: WorkspaceFact[];
  fact_count: number;
  last_hydrated_at: string;
}

function filterFactsByCategory(
  facts: WorkspaceFact[],
  category: WorkspaceFactCategory
): WorkspaceFact[] {
  return facts.filter((fact) => fact.category === category);
}

function sortFactsByConfidence(facts: WorkspaceFact[]): WorkspaceFact[] {
  const order: Record<WorkspaceFact["confidence"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...facts].sort((a, b) => order[a.confidence] - order[b.confidence]);
}

export async function hydrateWorkspaceKnowledge(
  store: WorkspaceFactStore
): Promise<WorkspaceKnowledgeSnapshot> {
  const allFacts = await store.listFacts();

  const architecture = sortFactsByConfidence(filterFactsByCategory(allFacts, "architecture"));
  const dependencies = sortFactsByConfidence(filterFactsByCategory(allFacts, "dependency"));
  const conventions = sortFactsByConfidence(filterFactsByCategory(allFacts, "convention"));
  const preferences = sortFactsByConfidence(filterFactsByCategory(allFacts, "preference"));
  const recurring_failures = sortFactsByConfidence(
    filterFactsByCategory(allFacts, "recurring_failure")
  );
  const runtime_facts = sortFactsByConfidence(filterFactsByCategory(allFacts, "runtime_fact"));

  return {
    architecture,
    dependencies,
    conventions,
    preferences,
    recurring_failures,
    runtime_facts,
    fact_count: allFacts.length,
    last_hydrated_at: new Date().toISOString(),
  };
}