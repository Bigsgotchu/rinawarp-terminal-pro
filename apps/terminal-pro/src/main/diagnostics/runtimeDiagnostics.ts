// @ts-nocheck
export function createRuntimeDiagnosticsHelpers(deps) {
    const {
        os,
        process,
        topCpuCmdSafe,
        getDefaultCwd,
        terminalWriteSafetyFields,
        executeViaEngine,
        engine,
        getLicenseTier,
    } = deps;
    async function runCommandOnceViaEngine(command, timeoutMs, cwd, risk = 'read') {
        const projectRoot = cwd || getDefaultCwd();
        const plan = [
            {
                tool: 'terminal.write',
                input: {
                    command,
                    cwd: projectRoot,
                    timeoutMs,
                    stepId: 'diagnostic',
                },
                stepId: 'diagnostic',
                description: `Diagnostic command: ${command}`,
                ...terminalWriteSafetyFields(risk),
                verification_plan: { steps: [] },
            },
        ];
        const report = await executeViaEngine({
            engine,
            plan,
            projectRoot,
            license: getLicenseTier(),
        });
        const result = report.steps[0]?.result;
        if (!result?.success) {
            const err = result?.error ?? 'Command failed';
            throw new Error(err);
        }
        return result.output ?? '';
    }
    function runCommandOnce(command, timeoutMs, cwd, risk = 'read') {
        return runCommandOnceViaEngine(command, timeoutMs, cwd, risk);
    }
    function runGatherCommand(cmd) {
        return new Promise(async (resolve) => {
            try {
                const output = await runCommandOnce(cmd.command, cmd.timeout);
                resolve({ description: cmd.description, output: output || '(no output)' });
            }
            catch (e) {
                resolve({ description: cmd.description, output: `Error: ${String(e)}` });
            }
        });
    }
    async function diagnoseHotLinux() {
        const cpus = os.cpus();
        const loadavg = os.loadavg?.() ?? [];
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const topProcesses = await runCommandOnce(topCpuCmdSafe.replace('head -15', 'head -n 15'), 8000).catch((e) => `Unable to read processes: ${String(e)}`);
        const sensors = await runCommandOnce('sensors', 8000).catch(() => 'No `sensors` output.');
        return {
            platform: process.platform,
            cpuModel: cpus?.[0]?.model ?? 'unknown',
            cpuCores: cpus?.length ?? 0,
            loadavg,
            mem: { totalBytes: totalMem, freeBytes: freeMem },
            topProcesses,
            sensors,
        };
    }
    return {
        diagnoseHotLinux,
        runCommandOnceViaEngine,
        runCommandOnce,
        runGatherCommand,
    };
}
