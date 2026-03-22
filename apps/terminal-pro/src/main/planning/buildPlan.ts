// @ts-nocheck
export function createBuildPlanHelpers(deps) {
    const { fs, path, playbooks, topCpuCmdSafeShort } = deps;
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
                const installStep = {
                    id: 'install',
                    tool: 'terminal',
                    command: 'npm ci',
                    risk: 'safe-write',
                    description: 'Install dependencies',
                };
                return workflow === 'test'
                    ? [
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
                    ]
                    : [
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
