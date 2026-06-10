// @ts-nocheck
import fs from 'node:fs/promises'
import path from 'node:path'
import { hasSharedWorkspaceFile, readSharedWorkspaceTextFile } from '../runtime/runtimeAccess.js'
import type { BuildPlanHelperDeps } from '../startup/runtimeTypes.js'
import type { WorkspaceContext } from '../memory/workspaceContextBuilder.js'

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
        const riskLevel = risk === 'high-impact' || risk === 'dangerous' ? 'high' : risk === 'safe-write' ? 'medium' : 'low';
        const mutation = risk !== 'inspect';
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
            requiresApproval: risk !== 'inspect',
            mutation,
            description,
        };
    }
    let projectRootCache = '';
    async function hasProjectFile(projectRoot, relativePath) {
        if (await hasSharedWorkspaceFile(projectRoot, relativePath))
            return true;
        try {
            await fs.access(path.join(projectRoot, relativePath));
            return true;
        }
        catch {
            return false;
        }
    }
    async function readProjectTextFile(projectRoot, relativePath) {
        const sharedText = await readSharedWorkspaceTextFile(projectRoot, relativePath);
        if (sharedText != null)
            return sharedText;
        try {
            return await fs.readFile(path.join(projectRoot, relativePath), 'utf8');
        }
        catch {
            return null;
        }
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
    function workspaceFactValue(workspaceContext: WorkspaceContext | undefined, key: string): string | null {
        if (!workspaceContext) return null;
        const facts = [
            ...workspaceContext.architecture,
            ...workspaceContext.dependencies,
            ...workspaceContext.runtimeFacts,
            ...workspaceContext.deploymentFacts,
        ];
        const match = facts.find((fact) => fact.key === key);
        return match?.value || null;
    }
    function detectBuildKindFromWorkspaceContext(workspaceContext?: WorkspaceContext): 'node' | 'python' | 'rust' | 'go' | null {
        if (!workspaceContext) return null;
        const packageManager = workspaceFactValue(workspaceContext, 'package.manager');
        const runtime = workspaceFactValue(workspaceContext, 'runtime.primary');
        const framework = workspaceFactValue(workspaceContext, 'framework.primary');
        const ui = workspaceFactValue(workspaceContext, 'ui.primary');
        const joined = [packageManager, runtime, framework, ui].filter(Boolean).join(' ').toLowerCase();
        if (/\b(pnpm|npm|yarn|bun|node|react|vite|next|vue|svelte|angular|express|fastify|nest)\b/.test(joined)) return 'node';
        if (/\bpython|flask|django\b/.test(joined)) return 'python';
        if (/\brust|cargo\b/.test(joined)) return 'rust';
        if (/\bgo|gin|echo\b/.test(joined)) return 'go';
        return null;
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
    async function detectNodePackageManager(projectRoot, workspaceContext) {
        const observedPackageManager = workspaceFactValue(workspaceContext, 'package.manager');
        if (observedPackageManager && ['pnpm', 'npm', 'yarn', 'bun'].includes(observedPackageManager)) {
            return observedPackageManager;
        }
        if (await hasProjectFile(projectRoot, 'pnpm-lock.yaml'))
            return 'pnpm';
        return 'npm';
    }
    async function failedBuildSteps(projectRoot, workspaceContext) {
        projectRootCache = projectRoot || '';
        const packageManager = await detectNodePackageManager(projectRoot, workspaceContext);
        const buildCommand = packageManager === 'pnpm' ? 'pnpm build' : 'npm run build';
        return [
            toPlanStep({
                stepId: 'inspect_pwd',
                command: 'pwd',
                cwd: projectRoot,
                risk: 'inspect',
                description: 'Confirm the working directory before diagnosing the failed build',
            }),
            toPlanStep({
                stepId: 'inspect_files',
                command: 'ls',
                cwd: projectRoot,
                risk: 'inspect',
                description: 'Inspect package manager and project files',
            }),
            toPlanStep({
                stepId: 'inspect_package_json',
                command: 'cat package.json',
                cwd: projectRoot,
                risk: 'inspect',
                description: 'Inspect package scripts and dependency metadata',
            }),
            toPlanStep({
                stepId: 'run_failed_build',
                command: buildCommand,
                cwd: projectRoot,
                risk: 'inspect',
                description: 'Run one safe Node build diagnostic and capture the first concrete error',
                timeoutMs: 120_000,
            }),
        ];
    }
    async function buildStepsForKind(kind, projectRoot, workflow = 'build', workspaceContext) {
        projectRootCache = projectRoot || '';
        switch (kind) {
            case 'node': {
                const scripts = await readNodeScripts(projectRoot);
                const buildScript = firstAvailableScript(scripts, ['build', 'build:electron']);
                const testScript = firstAvailableScript(scripts, ['test', 'test:agent', 'test:unit', 'test:streaming']);
                const lintScript = firstAvailableScript(scripts, ['lint', 'lint:check']);
                const typecheckScript = firstAvailableScript(scripts, ['typecheck', 'type-check', 'check:types', 'tsc']);
                const deployScript = firstAvailableScript(scripts, ['deploy', 'publish']);
                const hasElectronBuilder = await hasProjectFile(projectRoot, 'electron-builder.yml');
                const packageManager = await detectNodePackageManager(projectRoot, workspaceContext);
                const installCommand = packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci';
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
                const runner = packageManager === 'pnpm' ? 'pnpm' : 'npm';
                if (workflow === 'test') {
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        toPlanStep({ stepId: 'package_manager_version', command: runner === 'pnpm' ? 'pnpm -v' : 'npm -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect package-manager version' }),
                        toPlanStep({
                            stepId: 'run_tests',
                            command: testScript ? `${runner} run ${testScript}` : runner === 'pnpm' ? 'pnpm test' : 'npm test',
                            cwd: projectRoot,
                            risk: 'inspect',
                            description: 'Run the current test gate',
                            timeoutMs: 120_000,
                        }),
                    ];
                } else if (workflow === 'lint') {
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        toPlanStep({ stepId: 'package_manager_version', command: runner === 'pnpm' ? 'pnpm -v' : 'npm -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect package-manager version' }),
                        toPlanStep({
                            stepId: 'run_lint',
                            command: lintScript ? `${runner} run ${lintScript}` : runner === 'pnpm' ? 'pnpm lint' : 'npm run lint',
                            cwd: projectRoot,
                            risk: 'inspect',
                            description: 'Run the current lint verification gate',
                            timeoutMs: 120_000,
                        }),
                    ];
                } else if (workflow === 'typecheck') {
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        toPlanStep({ stepId: 'package_manager_version', command: runner === 'pnpm' ? 'pnpm -v' : 'npm -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect package-manager version' }),
                        toPlanStep({
                            stepId: 'run_typecheck',
                            command: typecheckScript ? `${runner} run ${typecheckScript}` : runner === 'pnpm' ? 'pnpm exec tsc --noEmit' : 'npx tsc --noEmit',
                            cwd: projectRoot,
                            risk: 'inspect',
                            description: 'Run the current typecheck verification gate',
                            timeoutMs: 120_000,
                        }),
                    ];
                } else if (workflow === 'deploy') {
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
                            risk: 'dangerous',
                            description: 'Run the deploy command on the trusted path',
                            timeoutMs: 180_000,
                        }),
                    ];
                } else {
                    return [
                        inspectStatusStep,
                        inspectPackageStep,
                        toPlanStep({ stepId: 'node_version', command: 'node -v', cwd: projectRoot, risk: 'inspect', description: 'Inspect Node.js version' }),
                        toPlanStep({
                            stepId: 'build_project',
                            command: buildScript ? `${runner} run ${buildScript}` : `${runner} run build`,
                            cwd: projectRoot,
                            risk: 'inspect',
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
                        risk: 'inspect',
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
                        risk: 'inspect',
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
    async function makePlan(intentRaw, projectRoot, workspaceContext) {
        const intent = (intentRaw || '').trim().toLowerCase();
        const id = `plan_${Date.now()}`;
        const buildKind = detectBuildKindFromWorkspaceContext(workspaceContext) || (projectRoot ? await detectBuildKind(projectRoot) : 'unknown');
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
        if (/\b(delete|remove files?|rm\s+-|docker cleanup|cloud action|cloud deploy)\b/.test(intent)) {
            return {
                id,
                intent: intentRaw,
                reasoning: 'This request can affect workspace or cloud state, so it requires approval before execution.',
                steps: [
                    toPlanStep({ stepId: 'inspect_git_status', command: 'git status --short', cwd: projectRoot, risk: 'inspect', description: 'Inspect workspace state before a dangerous action' }),
                    toPlanStep({ stepId: 'approval_required_dangerous_action', tool: 'approval', command: 'requestApproval:dangerous_action', cwd: projectRoot, risk: 'dangerous', description: 'Request approval for a dangerous workspace or cloud action' }),
                ],
            };
        }
        if (intent.includes('deploy')) {
            const steps = await buildStepsForKind(buildKind, projectRoot, 'deploy', workspaceContext);
            if (steps.length > 0) {
                return {
                    id,
                    intent: intentRaw,
                    reasoning: `Detected ${buildKind} project. Deploy requires approval before any publishing step runs.`,
                    steps,
                };
            }
        }
        if (/\b(install|add package|add dependency|npm install|pnpm install|yarn install|bun install|npm i|pnpm add|npm update|pnpm update)\b/.test(intent)) {
            const packageManager = buildKind === 'node' ? await detectNodePackageManager(projectRoot, workspaceContext) : 'npm';
            const command = packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci';
            return {
                id,
                intent: intentRaw,
                reasoning: 'Installing or updating dependencies can change the workspace, so this requires approval before execution.',
                steps: [
                    toPlanStep({ stepId: 'inspect_git_status', command: 'git status --short', cwd: projectRoot, risk: 'inspect', description: 'Inspect workspace state before dependency changes' }),
                    toPlanStep({ stepId: 'install_dependencies', command, cwd: projectRoot, risk: 'safe-write', description: 'Install dependencies through the workspace package manager', timeoutMs: 120_000 }),
                ],
            };
        }
        if (/\b(fix|repair|refactor|write|edit)\b/.test(intent)) {
            return {
                id,
                intent: intentRaw,
                reasoning: 'Fixing or editing the workspace can mutate files, so this requires approval before execution.',
                steps: [
                    toPlanStep({ stepId: 'inspect_git_status', command: 'git status --short', cwd: projectRoot, risk: 'inspect', description: 'Inspect workspace state before a mutation' }),
                    toPlanStep({ stepId: 'approval_required_workspace_fix', tool: 'approval', command: 'requestApproval:workspace_fix', cwd: projectRoot, risk: 'safe-write', description: 'Request approval before modifying workspace files' }),
                ],
            };
        }
        if (/\b(plan a safe change|safe change|make a safe change)\b/.test(intent)) {
            const steps = await buildStepsForKind(buildKind, projectRoot, 'build', workspaceContext);
            return {
                id,
                intent: intentRaw,
                reasoning: `Detected ${buildKind} project. I'll verify the current project through the safest observed command before any mutation.`,
                steps,
            };
        }
        if (/\b(?:my\s+)?build\s+(?:is\s+)?(?:failing|failed|broken|erroring)\b/.test(intent) || /\b(?:diagnose|debug)\s+(?:the\s+)?(?:failed\s+)?build\b/.test(intent)) {
            const steps = buildKind === 'node' ? await failedBuildSteps(projectRoot, workspaceContext) : await buildStepsForKind(buildKind, projectRoot, 'build', workspaceContext);
            return {
                id,
                intent: intentRaw,
                reasoning: buildKind === 'node'
                    ? "Detected Node project. I'll inspect package metadata, run one safe build diagnostic, parse the failure, and stop before any approval-gated fix."
                    : `Detected ${buildKind} project. I'll run the safest available build diagnostic before proposing any fix.`,
                steps,
            };
        }
        if (intent.includes('build') || intent.includes('test') || intent.includes('lint') || intent.includes('typecheck') || intent.includes('type check') || intent.includes('tsc') || intent.includes('broken')) {
            const workflow = (intent.includes('typecheck') || intent.includes('type check') || intent.includes('tsc')) && !intent.includes('build') && !intent.includes('test')
                ? 'typecheck'
                : intent.includes('lint') && !intent.includes('build') && !intent.includes('test')
                ? 'lint'
                : intent.includes('test') && !intent.includes('build')
                ? 'test'
                : 'build';
            const steps = await buildStepsForKind(buildKind, projectRoot, workflow, workspaceContext);
            if (steps.length > 0) {
                return {
                    id,
                    intent: intentRaw,
                    reasoning: workflow === 'lint'
                        ? `Detected ${buildKind} project. I'll run the lint verification workflow and leave proof in the thread.`
                        : workflow === 'typecheck'
                        ? `Detected ${buildKind} project. I'll run the typecheck verification workflow and leave proof in the thread.`
                        : workflow === 'test'
                        ? `Detected ${buildKind} project. I'll run the test workflow and leave proof in the thread.`
                        : `Detected ${buildKind} project. I'll run the build workflow and capture failures with proof before proposing any fix.`,
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
