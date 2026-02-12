/**
 * @rinawarp/tools
 *
 * Terminal internals - exported for use by tool implementations.
 * These functions are used by TerminalWriteTool to safely execute commands.
 */
/**
 * Split command into executable and arguments (prevents shell injection)
 */
export declare function splitCommand(cmd: string): {
    file: string;
    args: string[];
};
/**
 * Secure environment filtering - prevents credential bleed into agent execution
 */
export declare function safeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
