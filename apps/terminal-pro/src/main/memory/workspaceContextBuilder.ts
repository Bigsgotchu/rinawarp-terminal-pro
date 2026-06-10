import type { WorkspaceFact, WorkspaceFactConfidence } from "./memoryTypes.js";
import type { WorkspaceKnowledgeSnapshot } from "./workspaceKnowledge.js";
import type { ProjectInspectionResult } from "./projectInspector.js";

export type WorkspaceContext = {
  architecture: WorkspaceFact[];
  dependencies: WorkspaceFact[];
  runtimeFacts: WorkspaceFact[];
  deploymentFacts: WorkspaceFact[];
  conventions: WorkspaceFact[];
  preferences: WorkspaceFact[];
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
  };
  conflictSummary: {
    totalConflicts: number;
    conflicts: Array<{ key: string; persistedValue: string; observedValue: string }>;
  };
};

function getConfidenceOrder(confidence: WorkspaceFactConfidence): number {
  return { high: 0, medium: 1, low: 2 }[confidence];
}

function factsByKey(facts: WorkspaceFact[]): Map<string, WorkspaceFact> {
  const map = new Map<string, WorkspaceFact>();
  for (const fact of facts) {
    const existing = map.get(fact.key);
    if (!existing || getConfidenceOrder(fact.confidence) < getConfidenceOrder(existing.confidence)) {
      map.set(fact.key, fact);
    }
  }
  return map;
}

function selectFactsByCategory(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>,
  category: WorkspaceFact["category"]
): WorkspaceFact[] {
  const result: WorkspaceFact[] = [];
  const seenKeys = new Set<string>();

  for (const fact of persisted.values()) {
    if (fact.category === category && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  for (const fact of observed.values()) {
    if (fact.category === category && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  return result.sort((a, b) => getConfidenceOrder(a.confidence) - getConfidenceOrder(b.confidence));
}

function selectArchitectureFacts(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>
): WorkspaceFact[] {
  const keyPatterns = [/runtime\./, /shell\./, /agent\./, /ui\./];
  const result: WorkspaceFact[] = [];
  const seenKeys = new Set<string>();

  for (const fact of persisted.values()) {
    if (fact.category === "architecture" && keyPatterns.some((p) => p.test(fact.key)) && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }
  for (const fact of observed.values()) {
    if (fact.category === "architecture" && keyPatterns.some((p) => p.test(fact.key)) && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  return result.sort((a, b) => getConfidenceOrder(a.confidence) - getConfidenceOrder(b.confidence));
}

function selectDependencyFacts(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>
): { facts: WorkspaceFact[]; conflicts: Array<{ key: string; persistedValue: string; observedValue: string }> } {
  const result: WorkspaceFact[] = [];
  const conflicts: Array<{ key: string; persistedValue: string; observedValue: string }> = [];
  const seenKeys = new Set<string>();

  for (const fact of persisted.values()) {
    if (fact.category === "dependency" && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }
  for (const fact of observed.values()) {
    if (fact.category === "dependency" && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  return { facts: result.sort((a, b) => getConfidenceOrder(a.confidence) - getConfidenceOrder(b.confidence)), conflicts };
}

function selectRuntimeFacts(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>
): WorkspaceFact[] {
  const result: WorkspaceFact[] = [];
  const seenKeys = new Set<string>();

  for (const fact of persisted.values()) {
    if (fact.category === "runtime_fact" && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }
  for (const fact of observed.values()) {
    if (fact.category === "runtime_fact" && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  return result.sort((a, b) => getConfidenceOrder(a.confidence) - getConfidenceOrder(b.confidence));
}

function selectDeploymentFacts(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>
): WorkspaceFact[] {
  const keyPatterns = [/deploy/, /publish/, /canDeploy/, /electron/, /vercel/, /netlify/, /docker/];
  const result: WorkspaceFact[] = [];
  const seenKeys = new Set<string>();

  for (const fact of persisted.values()) {
    if (keyPatterns.some((p) => p.test(fact.key)) && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }
  for (const fact of observed.values()) {
    if (keyPatterns.some((p) => p.test(fact.key)) && !seenKeys.has(fact.key)) {
      result.push(fact);
      seenKeys.add(fact.key);
    }
  }

  return result.sort((a, b) => getConfidenceOrder(a.confidence) - getConfidenceOrder(b.confidence));
}

function countConfidence(facts: WorkspaceFact[]): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const fact of facts) {
    counts[fact.confidence]++;
  }
  return counts;
}

function mergeAllConflicts(
  persisted: Map<string, WorkspaceFact>,
  observed: Map<string, WorkspaceFact>
): Array<{ key: string; persistedValue: string; observedValue: string }> {
  const conflicts: Array<{ key: string; persistedValue: string; observedValue: string }> = [];

  for (const fact of observed.values()) {
    if (persisted.has(fact.key)) {
      const persistedFact = persisted.get(fact.key)!;
      if (persistedFact.value !== fact.value) {
        conflicts.push({
          key: fact.key,
          persistedValue: persistedFact.value,
          observedValue: fact.value,
        });
      }
    }
  }

  return conflicts;
}

export function buildWorkspaceContext(
  snapshot: WorkspaceKnowledgeSnapshot,
  inspection: ProjectInspectionResult
): WorkspaceContext {
  const persistedMap = factsByKey([
    ...snapshot.architecture,
    ...snapshot.dependencies,
    ...snapshot.conventions,
    ...snapshot.preferences,
    ...snapshot.recurring_failures,
    ...snapshot.runtime_facts,
  ]);

  const observedMap = factsByKey(inspection.facts);

  const architecture = selectArchitectureFacts(persistedMap, observedMap);
  const dependencyResult = selectDependencyFacts(persistedMap, observedMap);
  const dependencies = dependencyResult.facts;
  const deploymentFacts = selectDeploymentFacts(persistedMap, observedMap);
  const runtimeFacts = selectRuntimeFacts(persistedMap, observedMap);

  const conventions = selectFactsByCategory(persistedMap, observedMap, "convention");
  const preferences = selectFactsByCategory(persistedMap, observedMap, "preference");

  const allMergedFacts = [
    ...architecture,
    ...dependencies,
    ...runtimeFacts,
    ...deploymentFacts,
    ...conventions,
    ...preferences,
  ];

  const allConflicts = mergeAllConflicts(persistedMap, observedMap);

  return {
    architecture,
    dependencies,
    runtimeFacts,
    deploymentFacts,
    conventions,
    preferences,
    confidenceSummary: countConfidence(allMergedFacts),
    conflictSummary: {
      totalConflicts: allConflicts.length,
      conflicts: allConflicts,
    },
  };
}