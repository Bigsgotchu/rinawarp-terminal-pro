import { describe, expect, it, beforeEach } from "vitest";

import {
  createMemoryWorkspaceFactStore,
  resetMemoryWorkspaceFactStore,
} from "../../src/main/memory/workspaceFactStore.js";
import {
  createWorkspaceFact,
  type WorkspaceFact,
} from "../../src/main/memory/memoryTypes.js";
import {
  hydrateWorkspaceKnowledge,
  buildKnowledgeSummary,
  formatKnowledgeForDisplay,
  type WorkspaceKnowledgeSnapshot,
  type KnowledgeSummary,
} from "../../src/main/memory/workspaceKnowledge.js";

function makeFact(overrides: Partial<WorkspaceFact> = {}): WorkspaceFact {
  return createWorkspaceFact({
    id: "fact_test_123",
    key: "architecture.runtime",
    value: "AgentRuntime",
    category: "architecture",
    source: "config",
    confidence: "high",
    ...overrides,
  });
}

describe("hydrateWorkspaceKnowledge", () => {
  beforeEach(() => {
    resetMemoryWorkspaceFactStore();
  });

  it("returns empty snapshot when store is empty", async () => {
    const store = createMemoryWorkspaceFactStore();
    const snapshot = await hydrateWorkspaceKnowledge(store);

    expect(snapshot.fact_count).toBe(0);
    expect(snapshot.architecture).toEqual([]);
    expect(snapshot.dependencies).toEqual([]);
    expect(snapshot.conventions).toEqual([]);
    expect(snapshot.preferences).toEqual([]);
    expect(snapshot.recurring_failures).toEqual([]);
    expect(snapshot.runtime_facts).toEqual([]);
    expect(typeof snapshot.last_hydrated_at).toBe("string");
  });

  it("hydrates facts by category", async () => {
    const store = createMemoryWorkspaceFactStore();

    await store.upsertFact(
      makeFact({ id: "arch_1", key: "runtime", category: "architecture" })
    );
    await store.upsertFact(
      makeFact({ id: "arch_2", key: "shell", category: "architecture" })
    );
    await store.upsertFact(
      makeFact({ id: "dep_1", key: "sqlite", category: "dependency" })
    );
    await store.upsertFact(
      makeFact({ id: "pref_1", key: "user pref", category: "preference" })
    );
    await store.upsertFact(
      makeFact({ id: "rf_1", key: "build error", category: "recurring_failure" })
    );
    await store.upsertFact(
      makeFact({ id: "conv_1", key: "naming", category: "convention" })
    );
    await store.upsertFact(
      makeFact({ id: "rt_1", key: "verified fact", category: "runtime_fact" })
    );

    const snapshot = await hydrateWorkspaceKnowledge(store);

    expect(snapshot.fact_count).toBe(7);
    expect(snapshot.architecture.length).toBe(2);
    expect(snapshot.dependencies.length).toBe(1);
    expect(snapshot.preferences.length).toBe(1);
    expect(snapshot.recurring_failures.length).toBe(1);
    expect(snapshot.conventions.length).toBe(1);
    expect(snapshot.runtime_facts.length).toBe(1);
  });

  it("sorts facts by confidence within each category", async () => {
    const store = createMemoryWorkspaceFactStore();

    await store.upsertFact(
      makeFact({ id: "arch_low", category: "architecture", confidence: "low" })
    );
    await store.upsertFact(
      makeFact({ id: "arch_high", category: "architecture", confidence: "high" })
    );
    await store.upsertFact(
      makeFact({ id: "arch_med", category: "architecture", confidence: "medium" })
    );

    const snapshot = await hydrateWorkspaceKnowledge(store);

    expect(snapshot.architecture[0].confidence).toBe("high");
    expect(snapshot.architecture[1].confidence).toBe("medium");
    expect(snapshot.architecture[2].confidence).toBe("low");
  });

  it("includes low-confidence facts marked by confidence field", async () => {
    const store = createMemoryWorkspaceFactStore();

    await store.upsertFact(
      makeFact({ id: "guess_1", category: "runtime_fact", confidence: "low" })
    );

    const snapshot = await hydrateWorkspaceKnowledge(store);

    expect(snapshot.runtime_facts.length).toBe(1);
    expect(snapshot.runtime_facts[0].confidence).toBe("low");
    expect(snapshot.runtime_facts[0].id).toBe("guess_1");
  });

  it("returns snapshot with last_hydrated_at timestamp", async () => {
    const store = createMemoryWorkspaceFactStore();
    const before = new Date().toISOString();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const snapshot = await hydrateWorkspaceKnowledge(store);

    const after = new Date().toISOString();
    expect(snapshot.last_hydrated_at >= before).toBe(true);
    expect(snapshot.last_hydrated_at <= after).toBe(true);
    expect(typeof snapshot.last_hydrated_at).toBe("string");
  });

  it("creates snapshot matching expected interface", async () => {
    const store = createMemoryWorkspaceFactStore();
    const snapshot = await hydrateWorkspaceKnowledge(store);

    const expectedKeys: (keyof WorkspaceKnowledgeSnapshot)[] = [
      "architecture",
      "dependencies",
      "conventions",
      "preferences",
      "recurring_failures",
      "runtime_facts",
      "fact_count",
      "last_hydrated_at",
    ];

    for (const key of expectedKeys) {
      expect(snapshot).toHaveProperty(key);
    }
  });
});

describe("buildKnowledgeSummary", () => {
  it("builds summary from snapshot with all categories", () => {
    const snapshot: WorkspaceKnowledgeSnapshot = {
      architecture: [makeFact({ id: "arch_1", value: "AgentRuntime", confidence: "medium" })],
      dependencies: [makeFact({ id: "dep_1", value: "SQLite", confidence: "medium" })],
      conventions: [makeFact({ id: "conv_1", value: "camelCase naming", confidence: "medium" })],
      preferences: [makeFact({ id: "pref_1", value: "dark mode", confidence: "medium" })],
      recurring_failures: [makeFact({ id: "rf_1", value: "TypeScript compile error", confidence: "medium" })],
      runtime_facts: [makeFact({ id: "rt_1", value: "Proof enabled", confidence: "medium" })],
      fact_count: 5,
      last_hydrated_at: "2026-06-09T00:00:00.000Z",
    };

    const summary = buildKnowledgeSummary(snapshot);

    expect(summary.architecture).toBe("- AgentRuntime");
    expect(summary.dependencies).toBe("- SQLite");
    expect(summary.conventions).toBe("- camelCase naming");
    expect(summary.preferences).toBe("- dark mode");
    expect(summary.recurring_failures).toBe("- TypeScript compile error");
    expect(summary.runtime_facts).toBe("- Proof enabled");
    expect(summary.confidence.high).toBe(0);
    expect(summary.confidence.medium).toBe(6);
    expect(summary.confidence.low).toBe(0);
  });

  it("counts confidence levels correctly", () => {
    const snapshot: WorkspaceKnowledgeSnapshot = {
      architecture: [
        makeFact({ id: "a1", confidence: "high" }),
        makeFact({ id: "a2", confidence: "high" }),
      ],
      dependencies: [makeFact({ id: "d1", confidence: "medium" })],
      conventions: [],
      preferences: [],
      recurring_failures: [makeFact({ id: "r1", confidence: "low" })],
      runtime_facts: [],
      fact_count: 4,
      last_hydrated_at: "2026-06-09T00:00:00.000Z",
    };

    const summary = buildKnowledgeSummary(snapshot);

    expect(summary.confidence.high).toBe(2);
    expect(summary.confidence.medium).toBe(1);
    expect(summary.confidence.low).toBe(1);
  });

  it("returns None for empty categories", () => {
    const snapshot: WorkspaceKnowledgeSnapshot = {
      architecture: [],
      dependencies: [],
      conventions: [],
      preferences: [],
      recurring_failures: [],
      runtime_facts: [],
      fact_count: 0,
      last_hydrated_at: "2026-06-09T00:00:00.000Z",
    };

    const summary = buildKnowledgeSummary(snapshot);

    expect(summary.architecture).toBe("None");
    expect(summary.dependencies).toBe("None");
    expect(summary.conventions).toBe("None");
    expect(summary.preferences).toBe("None");
    expect(summary.recurring_failures).toBe("None");
    expect(summary.runtime_facts).toBe("None");
  });
});

describe("formatKnowledgeForDisplay", () => {
  it("formats summary into human-readable output", () => {
    const summary: KnowledgeSummary = {
      architecture: "- AgentRuntime\n- Agent Shell",
      dependencies: "- SQLite\n- npm",
      conventions: "- camelCase",
      preferences: "- dark mode",
      recurring_failures: "- TypeScript error",
      runtime_facts: "- Proof enabled",
      confidence: { high: 3, medium: 2, low: 1 },
    };

    const output = formatKnowledgeForDisplay(summary);

    expect(output).toContain("Workspace Knowledge");
    expect(output).toContain("Architecture");
    expect(output).toContain("- AgentRuntime");
    expect(output).toContain("- Agent Shell");
    expect(output).toContain("Dependencies");
    expect(output).toContain("- SQLite");
    expect(output).toContain("- npm");
    expect(output).toContain("Conventions");
    expect(output).toContain("- camelCase");
    expect(output).toContain("Preferences");
    expect(output).toContain("- dark mode");
    expect(output).toContain("Recurring Failures");
    expect(output).toContain("- TypeScript error");
    expect(output).toContain("Runtime Facts");
    expect(output).toContain("- Proof enabled");
    expect(output).toContain("Confidence");
    expect(output).toContain("- 3 high");
    expect(output).toContain("- 2 medium");
    expect(output).toContain("- 1 low");
  });

  it("formats output with None for empty categories", () => {
    const summary: KnowledgeSummary = {
      architecture: "None",
      dependencies: "None",
      conventions: "None",
      preferences: "None",
      recurring_failures: "None",
      runtime_facts: "None",
      confidence: { high: 0, medium: 0, low: 0 },
    };

    const output = formatKnowledgeForDisplay(summary);

    expect(output).toContain("Architecture\nNone");
    expect(output).toContain("Dependencies\nNone");
    expect(output).toContain("Conventions\nNone");
    expect(output).toContain("Preferences\nNone");
    expect(output).toContain("Recurring Failures\nNone");
    expect(output).toContain("Runtime Facts\nNone");
  });
});