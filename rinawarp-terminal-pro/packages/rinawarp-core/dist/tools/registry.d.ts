/**
 * @rinawarp/core
 *
 * Tool Registry - Adapts existing @rinawarp/tools to the enforcement spine.
 *
 * This module registers all available tools with their requirements, and execution categories,
 * confirmation implementations.
 *
 * IMPORTANT: All terminal execution goes through TerminalWriteTool which
 * calls the real @rinawarp/tools terminal.run(). No direct spawning allowed.
 */
import type { Tool, ToolCategory, ExecutionContext, ToolResult } from "../enforcement/types.js";
import type { EngineCap } from "../enforcement/engine-cap.js";
import { ToolRegistry } from "../enforcement/index.js";
interface FileReadInput {
    path: string;
    encoding?: string;
}
interface FileWriteInput {
    path: string;
    content: string;
}
interface FileExistsInput {
    path: string;
}
interface FileListInput {
    path: string;
}
interface FileDeleteInput {
    path: string;
}
interface GitStatusInput {
    cwd?: string;
}
interface GitLogInput {
    cwd?: string;
    count?: number;
}
interface GitCommitInput {
    cwd?: string;
    message: string;
}
interface GitStageInput {
    cwd?: string;
    paths: string[];
}
declare class FileReadTool implements Tool<FileReadInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: FileReadInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class FileWriteTool implements Tool<FileWriteInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: FileWriteInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class FileDeleteTool implements Tool<FileDeleteInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: FileDeleteInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class FileExistsTool implements Tool<FileExistsInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: FileExistsInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class FileListTool implements Tool<FileListInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: FileListInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class GitStatusTool implements Tool<GitStatusInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: GitStatusInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class GitLogTool implements Tool<GitLogInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: GitLogInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class GitCommitTool implements Tool<GitCommitInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: GitCommitInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class GitStageTool implements Tool<GitStageInput> {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: GitStageInput, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DoctorSensorsTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DoctorDfTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DoctorUptimeTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DoctorPsTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DoctorFreeTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DeployProdTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(input: {
        target: string;
    }, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
declare class DockerPruneTool implements Tool {
    name: string;
    category: ToolCategory;
    requiresConfirmation: boolean;
    run(_input: unknown, _ctx: ExecutionContext, _cap: EngineCap): Promise<ToolResult>;
}
/**
 * Create a tool registry with all standard tools registered.
 */
export declare function createStandardRegistry(): ToolRegistry;
/**
 * Create a read-only registry (for inspection/diagnostic modes).
 */
export declare function createReadOnlyRegistry(): ToolRegistry;
/**
 * Create a registry for doctor mode (includes diagnostic + safe write).
 */
export declare function createDoctorRegistry(): ToolRegistry;
export { FileReadTool, FileWriteTool, FileDeleteTool, FileExistsTool, FileListTool, GitStatusTool, GitLogTool, GitCommitTool, GitStageTool, DoctorSensorsTool, DoctorDfTool, DoctorUptimeTool, DoctorPsTool, DoctorFreeTool, DeployProdTool, DockerPruneTool, };
