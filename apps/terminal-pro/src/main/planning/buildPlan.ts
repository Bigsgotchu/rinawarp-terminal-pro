// @ts-nocheck
import { hasSharedWorkspaceFile, readSharedWorkspaceTextFile } from '../runtime/runtimeAccess.js'
import type { BuildPlanHelperDeps } from '../startup/runtimeTypes.js'

export function createBuildPlanHelpers(deps: BuildPlanHelperDeps) {
    const { playbooks, topCpuCmdSafeShort } = deps;
    const SELF_CHECK_PATTERN = /\b(scan yourself|check yourself|self-check|inspect current state|check the workbench|diagnose the app|what is broken right now)\b/i;
    const DEFAULT_TIMEOUT_MS = 60_000;
    function toPlanStep({
        stepId,
        tool = 'terminal',
        command,
        cwd = '',
        risk = 'inspect',
        description,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    }) {
        const riskLevel = risk === 'high-impact' ? 'high' : risk === 'safe-write' ? 'medium' : 'low';
        return {
            stepId,
            tool,
            input: {
                command,
                cwd: cwd || projectRootCache,
                timeoutMs,
            },
            risk,
            risk_level: riskLevel,
            requires_confirmation: risk !== 'inspect',
            description,
        };
    }
    let projectRootCache = '';
    async function hasProjectFile(projectRoot, relativePath) {
        return hasSharedWorkspaceFile(projectRoot, relativePath);
    }
    async function readProjectTextFile(projectRoot, relativePath) {
        return readSharedWorkspaceTextFile(projectRoot, relativePath);
    }
    async function detectBuildKind(projectRoot) {
        if (await hasProjectFile(projectRoot, 'package.json'))
            return 'node';
        if ((await hasProjectFile(projectRoot, 'pyproject.toml')) || (await hasProjectFile(projectRoot, 'requirements.txt')))
            return 'python';
        if (await hasProjectFile(projectRoot, 'Cargo.toml'))
            return 'rust';
        if (await hasProjectFile(projectRoot, 'go.mod'))
            return 'go';
        return 'unknown';
    }
    async function readNodeScripts(projectRoot) {
        if (!projectRoot)
            return new Set();
        try {
            const packageJson = await readProjectTextFile(projectRoot, 'package.json');
            if (!packageJson)
                return new Set();
            const parsed = JSON.parse(packageJson);
            return new Set(Object.keys(parsed.scripts || {}).filter((key) => typeof key === 'string' && key.trim().length > 0));
        }
        catch {
            return new Set();
        }
    }
    function firstAvailableScript(scripts, candidates) {
        for (const candidate of candidates) {
            if (scripts.has(candidate))
                return candidate;
        }
        return null;
    }
    async function buildStepsForKind(kind, projectRoot, workflow = 'build') {
        projectRootCache = projectRoot || '';
        switch (kind) {
            case 'node': {
                const scripts = await readNodeScripts(projectRoot);
                const buildScript = firstAvailableScript(scripts, ['build', 'build:electron']);
                const testScript = firstAvailableScript(scripts, ['test', 'test:agent', 'test:unit', 'test:streaming']);
                const deployScript = firstAvailableScript(scripts, ['deploy', 'publish']);
                const hasElectronBuilder = await hasProjectFile(projectRoot, 'electron-builder.yml');
                const installCommand = await hasProjectFile(projectRoot, 'pnpm-lock.yaml') ? 'pnpm install --frozen-lockfile' : 'npm ci';
                const inspectPackageStep = toPlanStep({
                    stepId: 'inspect_package_json',
                    command: 'cat package.json',
                    cwd: projectRoot,
                    risk: 'inspect',
                    description: 'Inspect package scripts and workspace metadata',
                });
                const inspectStatusStep = toPlanStep({
                    stepId: 'inspect_git_status',
                    command: 'git status --short',
                    cwd: projectRoot,
                    risk: 'inspect',
                    description: 'Inspect workspace state before execution',
                });
                const installStep = toPlanStep({
                    stepId: 'install_dependencies',
                    command: installCommand,
                    cwd: projectRoot,
                    risk: 'safe-write',
                    description: 'Install dependencies through the workspace package manager',
                    timeoutMs: 120_000,
                });
                if (workflow === 'test') {
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        toPlanStep({ stepId: 'npm_version', command: installCommand.startsWith('pnpm') ? 'pnpm -v' : 'npm -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect package-manager version' }),
                        installStep,
                        toPlanStep({
                            stepId: 'run_tests',
                            command: testScript ? `${installCommand.startsWith('pnpm') ? 'pnpm' : 'npm'} run ${testScript}` : installCommand.startsWith('pnpm') ? 'pnpm test' : 'npm test',
                            cwd: projectRoot,
                            risk: 'inspect',
                            description: 'Run the current test gate',
                            timeoutMs: 120_000,
                        }),
                    ];
                } else if (workflow === 'deploy') {
                    const runner = installCommand.startsWith('pnpm') ? 'pnpm' : 'npm';
                    const deployCommand = deployScript ? `${runner} run ${deployScript}` : hasElectronBuilder ? 'npx electron-builder --publish never' : 'echo "No deploy target detected"';
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        installStep,
                        toPlanStep({
                            stepId: 'build_for_deploy',
                            command: buildScript ? `${runner} run ${buildScript}` : `${runner} run build`,
                            cwd: projectRoot,
                            risk: 'safe-write',
                            description: 'Build the project for deployment',
                            timeoutMs: 120_000,
                        }),
                        toPlanStep({
                            stepId: 'deploy_project',
                            command: deployCommand,
                            cwd: projectRoot,
                            risk: 'high-impact',
                            description: 'Run the deploy command on the trusted path',
                            timeoutMs: 180_000,
                        }),
                    ];
                } else {
                    const runner = installCommand.startsWith('pnpm') ? 'pnpm' : 'npm';
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        installStep,
                        toPlanStep({
                            stepId: 'build_project',
                            command: buildScript ? `${runner} run ${buildScript}` : `${runner} run build`,
                            cwd: projectRoot,
                            risk: 'safe-write',
                            description: workflow === 'build' ? 'Build the current project' : 'Run the primary build workflow',
                            timeoutMs: 120_000,
                        }),
                    ];
                }
            }
            case 'python':
                return [
                    toPlanStep({ stepId: 'inspect_python_version', command: 'python -V', cwd: projectRoot, risk: 'inspect', description: 'Inspect Python version' }),
                    toPlanStep({ stepId: 'inspect_pip_version', command: 'pip -V', cwd: projectRoot, risk: 'inspect', description: 'Inspect pip version' }),
                    toPlanStep({ stepId: 'install_dependencies', command: 'pip install -r requirements.txt', cwd: projectRoot, risk: 'safe-write', description: 'Install Python dependencies', timeoutMs: 120_000 }),
                    toPlanStep({
                        stepId: workflow === 'test' ? 'run_tests' : 'validate_project',
                        command: workflow === 'test' ? 'pytest -q' : 'python -m compileall .',
                        cwd: projectRoot,
                        risk: 'inspect',
                        description: workflow === 'test' ? 'Run tests' : 'Validate the project',
                        timeoutMs: 120_000,
                    }),
                ];
            case 'rust':
                return [
                    toPlanStep({ stepId: 'inspect_rust_version', command: 'rustc -V', cwd: projectRoot, risk: 'inspect', description: 'Inspect Rust version' }),
                    toPlanStep({
                        stepId: workflow === 'test' ? 'run_tests' : 'build_project',
                        command: workflow === 'test' ? 'cargo test' : 'cargo build',
                        cwd: projectRoot,
                        risk: workflow === 'test' ? 'inspect' : 'safe-write',
                        description: workflow === 'test' ? 'Run cargo test' : 'Build the Rust project',
                        timeoutMs: 120_000,
                    }),
                ];
            case 'go':
                return [
                    toPlanStep({ stepId: 'inspect_go_version', command: 'go version', cwd: projectRoot, risk: 'inspect', description: 'Inspect Go version' }),
                    toPlanStep({
                        stepId: workflow === 'test' ? 'run_tests' : 'build_project',
                        command: workflow === 'test' ? 'go test ./...' : 'go build ./...',
                        cwd: projectRoot,
                        risk: workflow === 'test' ? 'inspect' : 'safe-write',
                        description: workflow === 'test' ? 'Run go test' : 'Build the Go project',
                        timeoutMs: 120_000,
                    }),
                ];
            default:
                return [
                    toPlanStep({ stepId: 'inspect_git_status', command: 'git status --short', cwd: projectRoot, risk: 'inspect', description: 'Inspect workspace state' }),
                    toPlanStep({ stepId: 'inspect_files', command: 'ls -la', cwd: projectRoot, risk: 'inspect', description: 'Inspect workspace files' }),
                ];
        }
    }
    async function makePlan(intentRaw, projectRoot) {
        const intent = (intentRaw || '').trim().toLowerCase();
        const id = `plan_${Date.now()}`;
        const buildKind = projectRoot ? await detectBuildKind(projectRoot) : 'unknown';
        for (const playbook of playbooks) {
            if (playbook.signals.some((s) => intent.includes(s))) {
                const steps = playbook.gatherCommands.map((cmd, i) => ({
                    stepId: `s${i + 1}`,
                    tool: 'terminal',
                    input: {
                        command: cmd.command,
                        cwd: projectRoot,
                        timeoutMs: DEFAULT_TIMEOUT_MS,
                    },
                    risk: 'inspect',
                    risk_level: 'low',
                    requires_confirmation: false,
                    description: cmd.description,
                }));
                return {
                    id,
                    intent: intentRaw,
                    reasoning: playbook.description,
                    steps,
                    playbookId: playbook.id,
                };
            }
        }
        if (SELF_CHECK_PATTERN.test(intentRaw || '') || intent.includes('self-check') || intent === 'self-check') {
            return {
                id,
                intent: intentRaw,
                    reasoning: "Running Rina self-check against policy checklist.",
                    steps: [
                    toPlanStep({ stepId: 's1', tool: 'selfCheck', command: 'executeSelfCheck', cwd: projectRoot, risk: 'inspect', description: 'Run self-check tool' }),
                ],
            };
        }
        if (intent.includes('build') || intent.includes('test') || intent.includes('broken') || intent.includes('fix')) {
            const workflow = intent.includes('test') && !intent.includes('build')
                ? 'test'
                : 'build';
            const steps = await buildStepsForKind(buildKind, projectRoot, workflow);
            if (steps.length > 0) {
                return {
                    id,
                    intent: intentRaw,
                    reasoning: workflow === 'test'
                        ? `Detected ${buildKind} project. I'll run the test workflow and leave proof in the thread.`
                        : `Detected ${buildKind} project. I'll run the build workflow to diagnose and fix issues.`,
                    steps,
                };
            }
        }
        if (intent.includes('deploy')) {
            const steps = await buildStepsForKind(buildKind, projectRoot, 'deploy');
            if (steps.length > 0) {
                return {
                    id,
                    intent: intentRaw,
                    reasoning: `Detected ${buildKind} project. I'll run the deploy workflow to get it live.`,
                    steps,
                };
            }
        }
        return {
            id,
            intent: intentRaw,
            reasoning: "I'll run diagnostics to understand what's happening.",
            steps: [
                toPlanStep({ stepId: 's1', command: 'uptime', cwd: projectRoot, risk: 'inspect', description: 'Inspect uptime' }),
                toPlanStep({ stepId: 's2', command: 'free -h', cwd: projectRoot, risk: 'inspect', description: 'Inspect memory pressure' }),
                toPlanStep({ stepId: 's3', command: topCpuCmdSafeShort, cwd: projectRoot, risk: 'inspect', description: 'Inspect the hottest CPU processes' }),
            ],
        };
    }
    return {
        makePlan,
        detectBuildKind,
        buildStepsForKind,
    };
}
