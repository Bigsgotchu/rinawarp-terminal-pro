/**
 * Terminal Tool Executor
 *
 * Executes shell commands safely with timeout support.
 */
import { spawn } from "node:child_process";
const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds
/**
 * Split command into executable and arguments (prevents shell injection)
 */
function splitCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    return { file: parts[0], args: parts.slice(1) };
}
/**
 * Secure environment filtering - prevents credential bleed into agent execution
 */
function safeEnv(env) {
    const BLOCKED = [
        "AWS_SECRET_ACCESS_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "DATABASE_URL",
        "CF_API_TOKEN",
        "NPM_TOKEN",
        "GITHUB_TOKEN",
        "SESSION_SECRET",
        "DOWNLOAD_TOKEN_SECRET"
    ];
    const filtered = {};
    for (const [k, v] of Object.entries(env)) {
        if (!BLOCKED.includes(k) && v !== undefined)
            filtered[k] = v;
    }
    return filtered;
}
export { safeEnv };
/**
 * Execute a terminal command.
 *
 * @param command - The shell command to execute
 * @param options - Optional execution settings
 * @returns Promise resolving to stdout/stderr and exit code
 */
export async function run(command, options) {
    const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
        // Secure command execution without shell, with filtered environment
        const { file, args } = splitCommand(command);
        const child = spawn(file, args, {
            cwd: options?.cwd,
            timeout,
            env: {
                ...safeEnv(process.env),
                ...options?.env,
                // Ensure consistent locale for output parsing
                LC_ALL: "C",
                LANG: "C",
            },
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => { stdout += d.toString(); });
        child.stderr.on("data", (d) => { stderr += d.toString(); });
        child.on("error", (err) => {
            reject(new Error(`Command execution error: ${err.message}`));
        });
        child.on("close", (code) => {
            if (code !== 0) {
                resolve({
                    stdout: stdout || "",
                    stderr: stderr || `Exit code ${code}`,
                    exitCode: code,
                });
            }
            else {
                resolve({
                    stdout: stdout || "",
                    stderr: stderr || "",
                    exitCode: 0,
                });
            }
        });
    });
}
/**
 * Execute a command and throw on non-zero exit code.
 *
 * @param command - The shell command to execute
 * @param options - Optional execution settings
 * @returns Promise resolving to stdout
 * @throws Error if command fails or times out
 */
export async function runOrThrow(command, options) {
    const result = await run(command, options);
    if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}\nstderr: ${result.stderr}`);
    }
    return result.stdout || result.stderr;
}
/**
 * Check if a command exists in PATH.
 *
 * @param command - Command name to check
 * @returns Promise resolving to true if command exists
 */
export async function commandExists(command) {
    try {
        const result = await run(`command -v ${command} 2>/dev/null || echo ""`);
        return result.stdout.trim().length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Get the current operating system platform.
 *
 * @returns "linux", "darwin", or "win32"
 */
export function getPlatform() {
    return process.platform;
}
/**
 * Platform-specific command helpers.
 */
export const platform = {
    darwin: {
        getBatteryInfo: "pmset -g batt",
        getThermalInfo: "sudo powermetrics --samplers=cpu_power -n 1 | grep -E '(CPU die temperature|CPU power)' || echo \"Thermal info unavailable\"",
        getCpuUsage: "top -l 1 | grep -E '(CPU usage|Idle)'",
    },
    linux: {
        getBatteryInfo: "cat /sys/class/power_supply/BAT*/capacity 2>/dev/null || echo \"Battery info unavailable\"",
        getThermalInfo: "cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -5 || echo \"Thermal info unavailable\"",
        getCpuUsage: "top -bn1 | grep 'Cpu(s)' || echo \"CPU info unavailable\"",
    },
    win32: {
        getBatteryInfo: "powercfg /batteryreport 2>&1 || echo \"Battery info unavailable\"",
        getThermalInfo: "wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature GET CurrentTemperature 2>&1 || echo \"Thermal info unavailable\"",
        getCpuUsage: "wmic cpu get loadpercentage 2>&1 || echo \"CPU info unavailable\"",
    },
};
