// @ts-nocheck
export function createBuildPlanHelpers(deps) {
    const { fs, path, playbooks, topCpuCmdSafeShort } = deps;
    const SELF_CHECK_PATTERN = /\b(scan yourself|check yourself|self-check|inspect current state|check the workbench|diagnose the app|what is broken right now)\b/i;
    function detectBuildKind(projectRoot) {
        const has = (p) => fs.existsSync(path.join(projectRoot, p));
        if (has('package.json'))
            return 'node';
        if (has('pyproject.toml') || has('requirements.txt'))
            return 'python';
        if (has('Cargo.toml'))
            return 'rust';
        if (has('go.mod'))
            return 'go';
        return 'unknown';
    }
    function readNodeScripts(projectRoot) {
        if (!projectRoot)
            return new Set();
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath))
                return new Set();
            const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
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
    function buildStepsForKind(kind, projectRoot, workflow = 'build') {
        switch (kind) {
            case 'node': {
                const scripts = readNodeScripts(projectRoot);
                const buildScript = firstAvailableScript(scripts, ['build', 'build:electron']);
                const testScript = firstAvailableScript(scripts, ['test', 'test:agent', 'test:unit', 'test:streaming']);
                const deployScript = firstAvailableScript(scripts, ['deploy', 'publish']);
                const hasElectronBuilder = fs.existsSync(path.join(projectRoot, 'electron-builder.yml'));
                const installStep = {
                    id: 'install',
                    tool: 'terminal',
                    command: 'npm ci',
                    risk: 'safe-write',
                    description: 'Install dependencies',
                };
                if (workflow === 'test') {
                    return [
                        { id: 'node_version', tool: 'terminal', command: 'node -v', risk: 'read' },
                        { id: 'npm_version', tool: 'terminal', command: 'npm -v', risk: 'read' },
                        installStep,
                        {
                            id: 'test',
                            tool: 'terminal',
                            command: testScript ? `npm run ${testScript}` : 'npm test',
                            risk: 'read',
                            description: 'Run tests',
                        },
                    ];
                } else if (workflow === 'deploy') {
                    const deployCommand = deployScript ? `npm run ${deployScript}` : hasElectronBuilder ? 'npx electron-builder --publish never' : 'echo "No deploy target detected"';
                    return [
                        { id: 'node_version', tool: 'terminal', command: 'node -v', risk: 'read' },
                        { id: 'npm_version', tool: 'terminal', command: 'npm -v', risk: 'read' },
                        installStep,
                        {
                            id: 'build',
                            tool: 'terminal',
                            command: buildScript ? `npm run ${buildScript}` : 'npm run build',
                            risk: 'safe-write',
                            description: 'Build project for deployment',
                        },
                        {
                            id: 'deploy',
                            tool: 'terminal',
                            command: deployCommand,
                            risk: 'safe-write',
                            description: 'Deploy project',
                        },
                    ];
                } else {
                    return [
                        { id: 'node_version', tool: 'terminal', command: 'node -v', risk: 'read' },
                        { id: 'npm_version', tool: 'terminal', command: 'npm -v', risk: 'read' },
                        installStep,
                        {
                            id: 'build',
                            tool: 'terminal',
                            command: buildScript ? `npm run ${buildScript}` : 'npm run build',
                            risk: 'safe-write',
                            description: 'Build project',
                        },
                    ];
                }
            }
            case 'python':
                return [
                    { id: 'py_version', tool: 'terminal', command: 'python -V', risk: 'read' },
                    { id: 'pip_version', tool: 'terminal', command: 'pip -V', risk: 'read' },
                    {
                        id: 'install',
                        tool: 'terminal',
                        command: 'pip install -r requirements.txt',
                        risk: 'safe-write',
                        description: 'Install dependencies',
                    },
                    {
                        id: workflow === 'test' ? 'test' : 'build',
                        tool: 'terminal',
                        command: workflow === 'test' ? 'pytest -q' : 'python -m compileall .',
                        risk: 'read',
                        description: workflow === 'test' ? 'Run tests' : 'Validate project',
                    },
                ];
            case 'rust':
                return [
                    { id: 'rust_version', tool: 'terminal', command: 'rustc -V', risk: 'read' },
                    {
                        id: workflow === 'test' ? 'test' : 'build',
                        tool: 'terminal',
                        command: workflow === 'test' ? 'cargo test' : 'cargo build',
                        risk: workflow === 'test' ? 'read' : 'safe-write',
                        description: workflow === 'test' ? 'Run tests' : 'Build project',
                    },
                ];
            case 'go':
                return [
                    { id: 'go_version', tool: 'terminal', command: 'go version', risk: 'read' },
                    {
                        id: workflow === 'test' ? 'test' : 'build',
                        tool: 'terminal',
                        command: workflow === 'test' ? 'go test ./...' : 'go build ./...',
                        risk: 'read',
                        description: workflow === 'test' ? 'Run tests' : 'Build project',
                    },
                ];
            default:
                return [
                    { id: 'git_status', tool: 'terminal', command: 'git status', risk: 'read' },
                    { id: 'list_files', tool: 'terminal', command: 'ls -la', risk: 'read' },
                ];
        }
    }
    function makePlan(intentRaw, projectRoot) {
        const intent = (intentRaw || '').trim().toLowerCase();
        const id = `plan_${Date.now()}`;
        const buildKind = projectRoot ? detectBuildKind(projectRoot) : 'unknown';
        for (const playbook of playbooks) {
            if (playbook.signals.some((s) => intent.includes(s))) {
                const steps = playbook.gatherCommands.map((cmd, i) => ({
                    id: `s${i + 1}`,
                    tool: 'terminal',
                    command: cmd.command,
                    risk: 'read',
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
                    { id: 's1', tool: 'selfCheck', command: 'executeSelfCheck', risk: 'read', description: 'Run self-check tool' },
                ],
            };
        }
        if (intent.includes('build') || intent.includes('test') || intent.includes('broken') || intent.includes('fix')) {
            const workflow = intent.includes('test') && !intent.includes('build')
                ? 'test'
                : 'build';
            const steps = buildStepsForKind(buildKind, projectRoot, workflow);
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
            const steps = buildStepsForKind(buildKind, projectRoot, 'deploy');
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
                { id: 's1', tool: 'terminal', command: 'uptime', risk: 'read' },
                { id: 's2', tool: 'terminal', command: 'free -h', risk: 'read' },
                { id: 's3', tool: 'terminal', command: topCpuCmdSafeShort, risk: 'read' },
            ],
        };
    }
    return {
        makePlan,
        detectBuildKind,
        buildStepsForKind,
    };
}
