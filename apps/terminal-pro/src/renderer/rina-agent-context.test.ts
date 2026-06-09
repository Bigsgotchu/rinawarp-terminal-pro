import { describe, expect, it } from "vitest";

import { buildAgentContext } from "../main/rina-agent.js";
import type { RinaAgentRequest } from "../main/rina-agent.js";
import { createWorkspaceFact } from "../main/memory/memoryTypes.js";

describe("buildAgentContext workspace knowledge injection", () => {
  it("receives workspace knowledge in agent state via request", async () => {
    const knowledge = {
      architecture: [
        createWorkspaceFact({
          key: "runtime",
          value: "AgentRuntime",
          category: "architecture",
          source: "config",
        }),
      ],
      dependencies: [
        createWorkspaceFact({
          key: "database",
          value: "SQLite",
          category: "dependency",
          source: "config",
        }),
      ],
      facts: [],
    };

    const request: RinaAgentRequest = {
      sessionId: "test_session",
      userMessage: "test",
      cwd: process.cwd(),
      recentTranscript: [],
      recentCommands: [],
      workspaceKnowledge: knowledge,
    };

    const state = buildAgentContext(request);

    expect(state.workspaceKnowledge).toBeDefined();
    expect(state.workspaceKnowledge?.architecture).toHaveLength(1);
    expect(state.workspaceKnowledge?.architecture[0].value).toBe("AgentRuntime");
    expect(state.workspaceKnowledge?.dependencies).toHaveLength(1);
    expect(state.workspaceKnowledge?.dependencies[0].value).toBe("SQLite");
    expect(state.workspaceKnowledge?.facts).toHaveLength(2);
  });

  it("returns empty workspace knowledge when not provided", async () => {
    const request: RinaAgentRequest = {
      sessionId: "test_session",
      userMessage: "test",
      cwd: process.cwd(),
      recentTranscript: [],
      recentCommands: [],
    };

    const state = buildAgentContext(request);

    expect(state.workspaceKnowledge).toBeUndefined();
  });
});