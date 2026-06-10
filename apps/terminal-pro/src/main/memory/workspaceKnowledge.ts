import type { WorkspaceFact, WorkspaceFactCategory } from './memoryTypes.js'
import type { WorkspaceFactStore } from './workspaceFactStore.js'

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

export interface KnowledgeSummary {
  architecture: string[]
  dependencies: string[]
  conventions: string[]
  preferences: string[]
  recurring_failures: string[]
  runtime_facts: string[]
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

function summarizeFacts(facts: WorkspaceFact[]): string[] {
  return facts.map((fact) => fact.value)
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
    architecture: summarizeFacts(snapshot.architecture),
    dependencies: summarizeFacts(snapshot.dependencies),
    conventions: summarizeFacts(snapshot.conventions),
    preferences: summarizeFacts(snapshot.preferences),
    recurring_failures: summarizeFacts(snapshot.recurring_failures),
    runtime_facts: summarizeFacts(snapshot.runtime_facts),
    confidence: confidenceCount,
  }
}

function appendSection(lines: string[], title: string, items: string[]): void {
  lines.push(title)
  if (items.length === 0) {
    lines.push('- None')
  } else {
    lines.push(...items.map((item) => `- ${item}`))
  }
  lines.push('')
}

export function formatKnowledgeForDisplay(summary: KnowledgeSummary): string {
  const lines: string[] = ['Workspace Knowledge', '']

  appendSection(lines, 'Architecture', summary.architecture)
  appendSection(lines, 'Dependencies', summary.dependencies)
  appendSection(lines, 'Conventions', summary.conventions)
  appendSection(lines, 'Preferences', summary.preferences)
  appendSection(lines, 'Recurring Failures', summary.recurring_failures)
  appendSection(lines, 'Runtime Facts', summary.runtime_facts)

  lines.push('Confidence')
  lines.push(`- ${summary.confidence.high} high`)
  lines.push(`- ${summary.confidence.medium} medium`)
  lines.push(`- ${summary.confidence.low} low`)

  return lines.join('\n')
}

export function buildWorkspaceKnowledgeInspection(snapshot: WorkspaceKnowledgeSnapshot): string {
  return formatKnowledgeForDisplay(buildKnowledgeSummary(snapshot))
}
