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
  }
}

export interface KnowledgeSummary {
  architecture: string
  dependencies: string
  conventions: string
  preferences: string
  recurring_failures: string
  runtime_facts: string
  confidence: {
    high: number
    medium: number
    low: number
  }
}

function countByConfidence(facts: WorkspaceFact[]): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 }
  for (const fact of facts) {
    counts[fact.confidence]++
  }
  return counts
}

function formatFactList(facts: WorkspaceFact[]): string {
  if (facts.length === 0) return "None"
  return facts.map((f) => `- ${f.value}`).join("\n")
}

export function buildKnowledgeSummary(snapshot: WorkspaceKnowledgeSnapshot): KnowledgeSummary {
  const allFactCategories = [
    ...snapshot.architecture,
    ...snapshot.dependencies,
    ...snapshot.conventions,
    ...snapshot.preferences,
    ...snapshot.recurring_failures,
    ...snapshot.runtime_facts,
  ]
  const confidenceCount = countByConfidence(allFactCategories)

  return {
    architecture: formatFactList(snapshot.architecture),
    dependencies: formatFactList(snapshot.dependencies),
    conventions: formatFactList(snapshot.conventions),
    preferences: formatFactList(snapshot.preferences),
    recurring_failures: formatFactList(snapshot.recurring_failures),
    runtime_facts: formatFactList(snapshot.runtime_facts),
    confidence: confidenceCount,
  }
}

export function formatKnowledgeForDisplay(summary: KnowledgeSummary): string {
  const lines: string[] = ["Workspace Knowledge", ""]

  lines.push("Architecture")
  lines.push(summary.architecture)
  lines.push("")

  lines.push("Dependencies")
  lines.push(summary.dependencies)
  lines.push("")

  lines.push("Conventions")
  lines.push(summary.conventions)
  lines.push("")

  lines.push("Preferences")
  lines.push(summary.preferences)
  lines.push("")

  lines.push("Recurring Failures")
  lines.push(summary.recurring_failures)
  lines.push("")

  lines.push("Runtime Facts")
  lines.push(summary.runtime_facts)
  lines.push("")

  lines.push("Confidence")
  lines.push(`- ${summary.confidence.high} high`)
  lines.push(`- ${summary.confidence.medium} medium`)
  lines.push(`- ${summary.confidence.low} low`)

  return lines.join("\n")
}