/**
 * @rinawarp/core
 *
 * Terminal Write Tool - Real implementation that executes commands safely.
 * This tool is the only place where terminal spawning happens.
 */
import { spawn } from "node:child_process";
import { isEngineCap } from "../enforcement/engine-cap.js";
import { run } from "@rinawarp/tools/terminal";
import { splitCommand, safeEnv } from "@rinawarp/tools/terminal-internals";
/**
 * Combine stdout and stderr, filtering out empty strings
 */
function combine(stdout, stderr) {
    const out = stdout?.trim() ? stdout : "";
    const err = stderr?.trim() ? stderr : "";
    return [out, err].filter(Boolean).join("\n");
}
/**
 * Streaming terminal execution with EngineCap enforcement and timeout support
 */
async function runStreaming(cap, input, ctx) {
    if (!isEngineCap(cap)) {
        return {
            success: false,
            error: "BYPASS_ATTEMPT: EngineCap required for terminal execution",
            output: "(no output)",
            meta: { command: input.command },
        };
    }
    const { file, args } = splitCommand(input.command);
    const timeout = input.timeoutMs ?? 60_000;
    const child = spawn(file, args, {
        shell: false,
        cwd: input.cwd ?? ctx.projectRoot,
        env: { ...safeEnv(process.env), ...input.env, LC_ALL: "C", LANG: "C" },
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    // Timeout timer
    const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        // Emit timeout event
        ctx.emit?.({
            type: "cancel",
            streamId: input.stepId,
            stepId: input.stepId,
            command: input.command,
            reason: "timeout",
        });
    }, timeout);
    child.stdout.on("data", (d) => {
        if (timedOut)
            return;
        const data = d.toString();
        stdout += data;
        ctx.emit?.({ type: "chunk", stream: "stdout", data, stepId: input.stepId });
    });
    child.stderr.on("data", (d) => {
        if (timedOut)
            return;
        const data = d.toString();
        stderr += data;
        ctx.emit?.({ type: "chunk", stream: "stderr", data, stepId: input.stepId });
    });
    return await new Promise((resolve) => {
        child.on("close", (code) => {
            clearTimeout(timeoutHandle);
            if (timedOut) {
                resolve({
                    success: false,
                    error: `TIMEOUT: Command exceeded ${timeout}ms limit`,
                    output: stdout || "(no output)",
                    meta: { command: input.command, timeout, stderr },
                });
                return;
            }
            const output = combine(stdout, stderr) || "(no output)";
            if (code !== 0) {
                resolve({
                    success: false,
                    error: `Exit code ${code ?? "unknown"}`,
                    output,
                    meta: { exitCode: code, command: input.command, stderr },
                });
                return;
            }
            resolve({
                success: true,
                output,
                meta: { exitCode: code, command: input.command, stderr },
            });
        });
        child.on("error", (err) => {
            clearTimeout(timeoutHandle);
            const output = combine(stdout, stderr) || "(no output)";
            resolve({
                success: false,
                error: err.message,
                output,
                meta: { command: input.command, stderr },
            });
        });
    });
}
/**
 * Terminal Write Tool - executes commands via the engine with proper enforcement
 */
export class TerminalWriteTool {
    name = "terminal.write";
    category = "safe-write";
    requiresConfirmation = false;
    async run(input, ctx, cap) {
        // Streaming path: preferred when ctx.emit exists (Electron UI)
        if (ctx.emit) {
            return await runStreaming(cap, input, ctx);
        }
        // Non-streaming path: CLI/tests/etc
        if (!isEngineCap(cap)) {
            return {
                success: false,
                error: "BYPASS_ATTEMPT: EngineCap required for terminal execution",
                output: "(no output)",
                meta: { command: input.command },
            };
        }
        let result;
        try {
            result = await run(input.command, {
                cwd: input.cwd ?? ctx.projectRoot,
                timeoutMs: input.timeoutMs ?? 60_000,
                env: input.env,
            });
        }
        catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
                output: "(no output)",
                meta: { command: input.command },
            };
        }
        const output = combine(result.stdout, result.stderr) || "(no output)";
        if (result.exitCode !== 0) {
            return {
                success: false,
                error: `Exit code ${result.exitCode ?? "unknown"}`,
                output,
                meta: { exitCode: result.exitCode, command: input.command, stderr: result.stderr },
            };
        }
        return {
            success: true,
            output,
            meta: { exitCode: result.exitCode, command: input.command, stderr: result.stderr },
        };
    }
}
