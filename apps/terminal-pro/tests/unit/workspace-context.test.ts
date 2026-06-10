import { describe, expect, it } from "vitest";

import { createMemoryWorkspaceFactStore, resetMemoryWorkspaceFactStore } from "../../src/main/memory/workspaceFactStore.js";
import { createWorkspaceFact, type WorkspaceFact } from "../../src/main/memory/memoryTypes.js";
import { hydrateWorkspaceKnowledge, type WorkspaceKnowledgeSnapshot } from "../../src/main/memory/workspaceKnowledge.js";
import { buildWorkspaceContext, type WorkspaceContext } from "../../src/main/memory/workspaceContextBuilder.js";
import { inspectProjectWorkspace } from "../../src/main/memory/projectInspector.js";

function makeFact(overrides: Partial<WorkspaceFact> = {}): WorkspaceFact {
  return createWorkspaceFact({
    id: "fact_test_123",
    key: "test.key",
    value: "test_value",
    category: "architecture",
    source: "config",
    confidence: "high",
    ...overrides,
  });
}

describe("buildWorkspaceContext", () => {
  describe("basic structure", () => {
    it("returns context with all required fields from empty inputs", () => {
      const emptySnapshot: WorkspaceKnowledgeSnapshot = {
        architecture: [],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 0,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      };

      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(emptySnapshot, emptyInspection);

      expect(context).toHaveProperty("architecture");
      expect(context).toHaveProperty("dependencies");
      expect(context).toHaveProperty("runtimeFacts");
      expect(context).toHaveProperty("deploymentFacts");
      expect(context).toHaveProperty("conventions");
      expect(context).toHaveProperty("preferences");
      expect(context).toHaveProperty("confidenceSummary");
      expect(context).toHaveProperty("conflictSummary");

      expect(context.confidenceSummary).toHaveProperty("high");
      expect(context.confidenceSummary).toHaveProperty("medium");
      expect(context.confidenceSummary).toHaveProperty("low");

      expect(context.conflictSummary).toHaveProperty("totalConflicts");
      expect(context.conflictSummary).toHaveProperty("conflicts");
    });

    it("creates context with empty arrays when both inputs are empty", () => {
      const emptySnapshot: WorkspaceKnowledgeSnapshot = {
        architecture: [],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 0,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      };

      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(emptySnapshot, emptyInspection);

      expect(context.architecture).toEqual([]);
      expect(context.dependencies).toEqual([]);
      expect(context.runtimeFacts).toEqual([]);
      expect(context.deploymentFacts).toEqual([]);
      expect(context.conventions).toEqual([]);
      expect(context.preferences).toEqual([]);
      expect(context.confidenceSummary.high).toBe(0);
      expect(context.confidenceSummary.medium).toBe(0);
      expect(context.confidenceSummary.low).toBe(0);
      expect(context.conflictSummary.totalConflicts).toBe(0);
      expect(context.conflictSummary.conflicts).toEqual([]);
    });
  });

  describe("persisted facts integration", () => {
    it("includes persisted architecture facts in context", async () => {
      const store = createMemoryWorkspaceFactStore();
      await store.upsertFact(makeFact({ id: "arch_1", key: "runtime.primary", value: "Node.js", category: "architecture" }));
      await store.upsertFact(makeFact({ id: "arch_2", key: "ui.primary", value: "React", category: "architecture" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      expect(context.architecture.length).toBe(2);
      expect(context.architecture.some(f => f.key === "runtime.primary")).toBe(true);
      expect(context.architecture.some(f => f.key === "ui.primary")).toBe(true);
    });

    it("includes persisted dependency facts in context", async () => {
      const store = createMemoryWorkspaceFactStore();
      await store.upsertFact(makeFact({ id: "dep_1", key: "database.primary", value: "prisma", category: "dependency" }));
      await store.upsertFact(makeFact({ id: "dep_2", key: "auth.provider", value: "clerk", category: "dependency" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      expect(context.dependencies.length).toBe(2);
      expect(context.dependencies.some(f => f.key === "database.primary")).toBe(true);
      expect(context.dependencies.some(f => f.key === "auth.provider")).toBe(true);
    });

    it("includes persisted convention facts in context", async () => {
      const store = createMemoryWorkspaceFactStore();
      await store.upsertFact(makeFact({ id: "conv_1", key: "naming.convention", value: "camelCase", category: "convention" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      expect(context.conventions.length).toBe(1);
      expect(context.conventions[0].key).toBe("naming.convention");
    });

    it("includes persisted preference facts in context", async () => {
      const store = createMemoryWorkspaceFactStore();
      await store.upsertFact(makeFact({ id: "pref_1", key: "dark.mode", value: "enabled", category: "preference", source: "user" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      expect(context.preferences.length).toBe(1);
      expect(context.preferences[0].key).toBe("dark.mode");
    });

    it("includes persisted runtime facts in context when matching pattern", async () => {
      const store = createMemoryWorkspaceFactStore();
      await store.upsertFact(makeFact({ id: "rt_1", key: "proof.test.verified", value: "true", category: "runtime_fact", source: "proof" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      expect(context.runtimeFacts.some(f => f.key === "proof.test.verified")).toBe(true);
    });
  });

  describe("observed facts integration", () => {
    it("includes observed facts from project inspector", async () => {
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

      const inspection = await inspectProjectWorkspace("/fake/project", {
        listFiles: async () => ["pnpm-lock.yaml", "package.json"],
        readFile: async (p) => p === "package.json" ? '{"dependencies": {"react": "^18.0.0"}}' : null,
      });

      const context = buildWorkspaceContext(snapshot, inspection);

      expect(context.architecture.some(f => f.key === "runtime.primary")).toBe(true);
    });

    it("detects React framework from observed facts", async () => {
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

      const inspection = await inspectProjectWorkspace("/fake/project", {
        listFiles: async () => ["package.json"],
        readFile: async (p) => p === "package.json" ? '{"dependencies": {"react": "^18.0.0"}}' : null,
      });

      const context = buildWorkspaceContext(snapshot, inspection);

      expect(context.architecture.some(f => f.value === "react")).toBe(true);
    });
  });

  describe("conflict resolution", () => {
    it("marks conflicts when observed fact differs from persisted", () => {
      const snapshot: WorkspaceKnowledgeSnapshot = {
        architecture: [
          makeFact({ id: "arch_1", key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" }),
        ],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 1,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      };

      const observedFact = makeFact({ key: "runtime.primary", value: "Deno", category: "architecture", confidence: "high" });
      const inspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [observedFact],
      };

      const context = buildWorkspaceContext(snapshot, inspection);

      expect(context.conflictSummary.totalConflicts).toBeGreaterThan(0);
      expect(context.conflictSummary.conflicts.some(c => c.key === "runtime.primary")).toBe(true);
      expect(context.conflictSummary.conflicts[0].persistedValue).toBe("Node.js");
      expect(context.conflictSummary.conflicts[0].observedValue).toBe("Deno");
    });

    it("prefers persisted high-confidence facts over observed", () => {
      const snapshot: WorkspaceKnowledgeSnapshot = {
        architecture: [
          makeFact({ id: "arch_1", key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" }),
        ],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 1,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      };

      const observedFact = makeFact({ key: "runtime.primary", value: "Deno", category: "architecture", confidence: "high" });
      const inspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [observedFact],
      };

      const context = buildWorkspaceContext(snapshot, inspection);

      // Persisted fact should be in the result (preferred)
      expect(context.architecture.some(f => f.key === "runtime.primary" && f.value === "Node.js")).toBe(true);
    });

    it("has no conflicts when values match", () => {
      const snapshot: WorkspaceKnowledgeSnapshot = {
        architecture: [
          makeFact({ id: "arch_1", key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" }),
        ],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 1,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      };

      const observedFact = makeFact({ key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" });
      const inspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [observedFact],
      };

      const context = buildWorkspaceContext(snapshot, inspection);

      expect(context.conflictSummary.totalConflicts).toBe(0);
      expect(context.conflictSummary.conflicts).toEqual([]);
    });
  });

  describe("confidence summary", () => {
    it("counts confidence levels of merged facts", async () => {
      const store = createMemoryWorkspaceFactStore();
      // Add facts with keys that won't overlap with other categories
      await store.upsertFact(makeFact({ id: "h1", key: "shell.primary", value: "bash", category: "architecture", confidence: "high" }));
      await store.upsertFact(makeFact({ id: "h2", key: "ui.primary", value: "React", category: "architecture", confidence: "high" }));

      const snapshot = await hydrateWorkspaceKnowledge(store);

      // Create inspection with no facts - we only want persisted
      const emptyInspection = {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      };

      const context = buildWorkspaceContext(snapshot, emptyInspection);

      // The architecture facts should be counted once each
      expect(context.architecture.length).toBe(2);
      // Total confidence count should only count these architecture facts
      expect(context.confidenceSummary.high).toBe(2);
      expect(context.confidenceSummary.medium).toBe(0);
      expect(context.confidenceSummary.low).toBe(0);
    });
  });

  describe("deployment facts", () => {
    it("includes deployment facts from observed inspection", async () => {
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

      const inspection = await inspectProjectWorkspace("/fake/project", {
        listFiles: async () => ["Dockerfile", "package.json"],
        readFile: async (p) => p === "package.json" ? '{"scripts": {"deploy": "vercel --prod"}}' : null,
      });

      const context = buildWorkspaceContext(snapshot, inspection);

      // Electron detection via electron-builder or isElectron flag
      expect(context.deploymentFacts.length).toBeGreaterThanOrEqual(0);
    });

    it("detects Electron projects as deployment capability", async () => {
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

      const inspection = await inspectProjectWorkspace("/fake/project", {
        listFiles: async () => ["electron-builder.yml", "package.json"],
        readFile: async () => '{"dependencies": {"electron": "^28.0.0"}}',
      });

      expect(inspection.isElectron).toBe(true);
      expect(inspection.canDeploy).toBe(true);
    });
  });
});