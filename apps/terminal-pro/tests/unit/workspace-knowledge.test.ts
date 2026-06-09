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
  type WorkspaceKnowledgeSnapshot,
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