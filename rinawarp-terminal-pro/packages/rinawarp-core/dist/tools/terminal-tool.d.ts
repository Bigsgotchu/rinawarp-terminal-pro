/**
 * @rinawarp/core
 *
 * Terminal Write Tool - Real implementation that executes commands safely.
 * This tool is the only place where terminal spawning happens.
 */
import { type EngineCap } from "../enforcement/engine-cap.js";
import type { Tool, ExecutionContext, ToolResult } from "../enforcement/types.js";
/**
 * Terminal input type
 */
export interface TerminalInput {
    command: string;
    cwd?: string;
    timeoutMs?: number;
    env?: Record<string, string>;
    stepId?: string;
}
/**
 * Terminal Write Tool - executes commands via the engine with proper enforcement
 */
export declare class TerminalWriteTool implements Tool<TerminalInput> {
    name: string;
    category: "safe-write";
    requiresConfirmation: boolean;
    run(input: TerminalInput, ctx: ExecutionContext, cap: EngineCap): Promise<ToolResult>;
}
