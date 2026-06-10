import { describe, expect, it } from "vitest";
import type { WorkspaceFact } from "../../src/main/memory/memoryTypes.js";
import { buildWorkspaceContext, type WorkspaceContext } from "../../src/main/memory/workspaceContextBuilder.js";
import { inspectProjectWorkspace } from "../../src/main/memory/projectInspector.js";
import { createBuildPlanHelpers } from "../../src/main/planning/buildPlan.js";

describe("workspace context planner integration", () => {
  const makeFact = (overrides: Partial<WorkspaceFact> = {}): WorkspaceFact => ({
    id: "fact_test",
    key: "test.key",
    value: "test_value",
    category: "architecture",
    source: "config",
    confidence: "medium",
    ...overrides,
  });

  it("provides empty context safely when no facts exist", () => {
    const emptyContext = buildWorkspaceContext(
      {
        architecture: [],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 0,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      },
      {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      }
    );

    expect(emptyContext.architecture).toEqual([]);
    expect(emptyContext.dependencies).toEqual([]);
    expect(emptyContext.runtimeFacts).toEqual([]);
    expect(emptyContext.deploymentFacts).toEqual([]);
    expect(emptyContext.conventions).toEqual([]);
    expect(emptyContext.preferences).toEqual([]);
    expect(emptyContext.confidenceSummary.high).toBe(0);
    expect(emptyContext.confidenceSummary.medium).toBe(0);
    expect(emptyContext.confidenceSummary.low).toBe(0);
    expect(emptyContext.conflictSummary.totalConflicts).toBe(0);
  });

  it("preserves conflicts when observed differs from persisted", () => {
    const persistedFact: WorkspaceFact = makeFact({
      id: "arch_1",
      key: "runtime.primary",
      value: "Node.js",
      category: "architecture",
      confidence: "high",
      source: "proof",
    });

    const observedFact: WorkspaceFact = makeFact({
      id: "arch_2",
      key: "runtime.primary",
      value: "Deno",
      category: "architecture",
      confidence: "medium",
      source: "runtime",
    });

    const context = buildWorkspaceContext(
      {
        architecture: [persistedFact],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 1,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      },
      {
        packageManager: null,
        framework: null,
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [observedFact],
      }
    );

    // Conflict should be recorded
    expect(context.conflictSummary.totalConflicts).toBe(1);
    expect(context.conflictSummary.conflicts[0].key).toBe("runtime.primary");
    expect(context.conflictSummary.conflicts[0].persistedValue).toBe("Node.js");
    expect(context.conflictSummary.conflicts[0].observedValue).toBe("Deno");

    // Persisted high-confidence value should be used (not observed)
    expect(context.architecture.length).toBe(1);
    expect(context.architecture[0].value).toBe("Node.js");
    expect(context.architecture[0].confidence).toBe("high");
  });

  it("does not mutate input context when accessed", () => {
    const originalFact: WorkspaceFact = makeFact({
      id: "arch_1",
      key: "shell.primary",
      value: "bash",
      category: "architecture",
      confidence: "high",
    });

    const snapshot = {
      architecture: [originalFact],
      dependencies: [],
      conventions: [],
      preferences: [],
      recurring_failures: [],
      runtime_facts: [],
      fact_count: 1,
      last_hydrated_at: "2026-06-09T00:00:00.000Z",
    };

    const inspection = {
      packageManager: null,
      framework: null,
      frameworks: [],
      isElectron: false,
      canDeploy: false,
      authPackages: [],
      databasePackages: [],
      facts: [],
    };

    const context: WorkspaceContext = buildWorkspaceContext(snapshot, inspection);

    // Mutate the returned context
    context.architecture.push(makeFact({ key: "shell.secondary", value: "zsh", category: "architecture" }));

    // Original snapshot should not be mutated
    expect(snapshot.architecture.length).toBe(1);
    expect(snapshot.architecture[0].key).toBe("shell.primary");
  });

  it("provides workspace context serializable to JSON", () => {
    const context = buildWorkspaceContext(
      {
        architecture: [makeFact({ key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" })],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 1,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      },
      {
        packageManager: "pnpm",
        framework: "React",
        frameworks: [],
        isElectron: false,
        canDeploy: false,
        authPackages: [],
        databasePackages: [],
        facts: [],
      }
    );

    // Should be JSON serializable (no functions, no circular references)
    const json = JSON.stringify(context);
    expect(json).toBeTruthy();
    expect(JSON.parse(json).architecture).toHaveLength(1);
    expect(JSON.parse(json).confidenceSummary).toEqual({ high: 1, medium: 0, low: 0 });
  });

  it("carries observed project facts needed by planning before the user explains the stack", async () => {
    const inspection = await inspectProjectWorkspace("/fake/project", {
      listFiles: async () => ["package-lock.json", "package.json", "vercel.json"],
      readFile: async (filePath) => filePath === "package.json"
        ? JSON.stringify({
            dependencies: {
              "@clerk/clerk-react": "^5.0.0",
              "better-sqlite3": "^12.0.0",
              react: "^18.0.0",
            },
            devDependencies: {
              vite: "^5.0.0",
            },
          })
        : null,
    });

    const context = buildWorkspaceContext(
      {
        architecture: [],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 0,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      },
      inspection
    );

    expect(context.architecture.map((fact) => [fact.key, fact.value])).toEqual(
      expect.arrayContaining([
        ["runtime.primary", "Node.js"],
        ["framework.primary", "vite, react"],
        ["ui.primary", "react"],
      ])
    );
    expect(context.dependencies.map((fact) => [fact.key, fact.value])).toEqual(
      expect.arrayContaining([
        ["package.manager", "npm"],
        ["database.primary", "better-sqlite3"],
        ["auth.provider", "@clerk/clerk-react"],
      ])
    );
    expect(context.deploymentFacts.map((fact) => [fact.key, fact.value])).toContainEqual([
      "deployment.target",
      "vercel",
    ]);
  });

  it("planner uses WorkspaceContext package manager and runtime facts when creating a plan", async () => {
    const helpers = createBuildPlanHelpers({
      fs: {},
      path: {},
      playbooks: [],
      topCpuCmdSafeShort: "ps aux",
    } as any);
    const context = buildWorkspaceContext(
      {
        architecture: [],
        dependencies: [],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [],
        fact_count: 0,
        last_hydrated_at: "2026-06-09T00:00:00.000Z",
      },
      {
        packageManager: "pnpm",
        framework: "vite",
        frameworks: ["vite", "react"],
        isElectron: false,
        canDeploy: true,
        deploymentTargets: ["vercel"],
        authPackages: ["@clerk/clerk-react"],
        databasePackages: ["better-sqlite3"],
        facts: [
          makeFact({ id: "pkg", key: "package.manager", value: "pnpm", category: "dependency", confidence: "high" }),
          makeFact({ id: "runtime", key: "runtime.primary", value: "Node.js", category: "architecture", confidence: "high" }),
          makeFact({ id: "deploy", key: "deployment.target", value: "vercel", category: "runtime_fact", confidence: "high" }),
        ],
      }
    );

    const plan = await helpers.makePlan("build the project", "/tmp/rina-no-lockfile-project", context);

    expect(plan.reasoning).toMatch(/Detected node project/i);
    expect(plan.steps.map((step: any) => step.input.command)).toContain("pnpm run build");
  });
});
