/**
 * Terminal Tool Executor
 *
 * Executes shell commands safely with timeout support.
 */
export interface TerminalResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}
export interface TerminalOptions {
    cwd?: string;
    timeoutMs?: number;
    env?: Record<string, string>;
}
/**
 * Secure environment filtering - prevents credential bleed into agent execution
 */
declare function safeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export { safeEnv };
/**
 * Execute a terminal command.
 *
 * @param command - The shell command to execute
 * @param options - Optional execution settings
 * @returns Promise resolving to stdout/stderr and exit code
 */
export declare function run(command: string, options?: TerminalOptions): Promise<TerminalResult>;
/**
 * Execute a command and throw on non-zero exit code.
 *
 * @param command - The shell command to execute
 * @param options - Optional execution settings
 * @returns Promise resolving to stdout
 * @throws Error if command fails or times out
 */
export declare function runOrThrow(command: string, options?: TerminalOptions): Promise<string>;
/**
 * Check if a command exists in PATH.
 *
 * @param command - Command name to check
 * @returns Promise resolving to true if command exists
 */
export declare function commandExists(command: string): Promise<boolean>;
/**
 * Get the current operating system platform.
 *
 * @returns "linux", "darwin", or "win32"
 */
export declare function getPlatform(): "linux" | "darwin" | "win32";
/**
 * Platform-specific command helpers.
 */
export declare const platform: {
    darwin: {
        getBatteryInfo: string;
        getThermalInfo: string;
        getCpuUsage: string;
    };
    linux: {
        getBatteryInfo: string;
        getThermalInfo: string;
        getCpuUsage: string;
    };
    win32: {
        getBatteryInfo: string;
        getThermalInfo: string;
        getCpuUsage: string;
    };
};
