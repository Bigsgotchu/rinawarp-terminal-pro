// @ts-nocheck
export function createPolicyGate(deps) {
    const { fs, ctx, resolveResourcePath, warnIfUnexpectedPackagedResource, sessionState, getCurrentRole } = deps;
    let cachedPolicy;
    function currentPolicyEnv() {
        const raw = (process.env.RINAWARP_ENV || process.env.NODE_ENV || 'dev').toLowerCase();
        if (raw.includes('prod'))
            return 'prod';
        if (raw.includes('stag'))
            return 'staging';
        return 'dev';
    }
    function parseRuleBlock(block) {
        const id = block.match(/-\s+id:\s*([^\n]+)/)?.[1]?.trim();
        const action = block.match(/\n\s*action:\s*([a-z_]+)/)?.[1]?.trim();
        if (!id || !action)
            return null;
        const approval = block.match(/\n\s*approval:\s*([a-z_]+)/)?.[1]?.trim();
        const typedPhrase = block.match(/\n\s*typed_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
        const message = block.match(/\n\s*message:\s*"?([^\n"]+)"?/)?.[1]?.trim();
        const regexes = [];
        for (const m of block.matchAll(/-\s*'([^']+)'/g)) {
            try {
                regexes.push(new RegExp(m[1], 'i'));
            }
            catch {
            }
        }
        let envAny;
        const envBlock = block.match(/when:\s*[\s\S]*?env:\s*[\s\S]*?any:\s*((?:\n\s*-\s*[^\n]+)+)/);
        if (envBlock?.[1]) {
            envAny = Array.from(envBlock[1].matchAll(/\n\s*-\s*([^\n]+)/g)).map((x) => x[1].trim());
        }
        return { id, action, approval, typedPhrase, message, envAny, regexes };
    }
    function loadPolicy() {
        if (cachedPolicy !== undefined)
            return (cachedPolicy || {
                rules: [],
                fallback: { action: 'require_approval', approval: 'click', message: 'Unclassified command requires approval.' },
            });
        let text = '';
        const policyPath = resolveResourcePath('policy/rinawarp-policy.yaml', 'repo');
        warnIfUnexpectedPackagedResource('policy yaml', policyPath);
        if (fs.existsSync(policyPath)) {
            text = fs.readFileSync(policyPath, 'utf8');
            ctx.lastLoadedPolicyPath = policyPath;
        }
        else {
            ctx.lastLoadedPolicyPath = null;
        }
        if (!text) {
            cachedPolicy = null;
            return loadPolicy();
        }
        const rulesSection = text.match(/\nrules:\s*\n([\s\S]*?)\nfallback:\s*\n/)?.[1] || '';
        const fallbackSection = text.split(/\nfallback:\s*\n/)[1] || '';
        const blocks = [];
        const starts = Array.from(rulesSection.matchAll(/(^|\n)\s*-\s+id:\s*[^\n]+/g)).map((m) => m.index ?? 0);
        for (let i = 0; i < starts.length; i += 1) {
            const s = starts[i];
            const e = i + 1 < starts.length ? starts[i + 1] : rulesSection.length;
            blocks.push(rulesSection.slice(s, e));
        }
        const rules = blocks.map(parseRuleBlock).filter((x) => !!x);
        const fallbackAction = fallbackSection.match(/\naction:\s*([a-z_]+)/)?.[1]?.trim() || 'require_approval';
        const fallbackApproval = fallbackSection.match(/\napproval:\s*([a-z_]+)/)?.[1]?.trim();
        const fallbackPhrase = fallbackSection.match(/\ntyped_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
        const fallbackMessage = fallbackSection.match(/\nmessage:\s*"?([^\n"]+)"?/)?.[1]?.trim();
        cachedPolicy = {
            rules,
            fallback: {
                action: fallbackAction,
                approval: fallbackApproval,
                typedPhrase: fallbackPhrase,
                message: fallbackMessage,
            },
        };
        if (process.env.RW_DEBUG === '1') {
            console.warn('[PROOFTRACE] loadPolicy', {
                policyPath,
                rules: rules.map((rule) => ({ id: rule.id, action: rule.action, envAny: rule.envAny })),
                fallback: cachedPolicy.fallback,
            });
        }
        return cachedPolicy;
    }
    function hasRecentCommand(regex, n) {
        const recent = sessionState.entries.filter((e) => e.type === 'execution_start').slice(-Math.max(1, n));
        return recent.some((e) => regex.test(e.command));
    }
    function evaluatePolicyGate(command, confirmed, confirmationText) {
        const policy = loadPolicy();
        const env = currentPolicyEnv();
        const match = policy.rules.find((rule) => {
            if (rule.envAny && !rule.envAny.includes(env))
                return false;
            return rule.regexes.some((r) => r.test(command));
        });
        const action = match?.action || policy.fallback.action;
        const approval = match?.approval || policy.fallback.approval || 'click';
        const typedPhrase = match?.typedPhrase || policy.fallback.typedPhrase || 'YES';
        const message = match?.message || policy.fallback.message || 'Policy blocked this command.';
        if (process.env.RW_DEBUG === '1') {
            console.warn('[PROOFTRACE] policyGate', {
                env,
                command,
                matchedRuleId: match?.id || null,
                action,
                approval,
                message,
                confirmed,
            });
        }
        if (action === 'deny')
            return { ok: false, message };
        if (action === 'allow')
            return { ok: true };
        if (currentPolicyEnv() === 'prod' && /high-impact|rm\s+-rf|terraform\s+apply|kubectl/i.test(command)) {
            const role = getCurrentRole();
            if (role !== 'owner') {
                return { ok: false, message: 'Policy: only owner can execute high-impact commands in prod.' };
            }
        }
        if (/terraform\s+apply/i.test(command) && !hasRecentCommand(/\bterraform\s+plan\b/i, 5)) {
            return { ok: false, message: 'Policy: terraform apply requires a recent terraform plan.' };
        }
        if (!confirmed)
            return { ok: false, message: `${message} Confirmation required.` };
        if (approval === 'typed_yes' && confirmationText !== 'YES') {
            return { ok: false, message: 'Policy: typed confirmation must be exactly "YES".' };
        }
        if (approval === 'typed_phrase' && confirmationText !== typedPhrase) {
            return { ok: false, message: `Policy: typed phrase must be exactly "${typedPhrase}".` };
        }
        return { ok: true };
    }
    function explainPolicy(command) {
        const policy = loadPolicy();
        const env = currentPolicyEnv();
        const match = policy.rules.find((rule) => {
            if (rule.envAny && !rule.envAny.includes(env))
                return false;
            return rule.regexes.some((r) => r.test(command));
        });
        return {
            env,
            action: match?.action || policy.fallback.action,
            approval: match?.approval || policy.fallback.approval || 'click',
            message: match?.message || policy.fallback.message || 'Unclassified command requires approval.',
            typedPhrase: match?.typedPhrase || policy.fallback.typedPhrase,
            matchedRuleId: match?.id,
        };
    }
    return {
        evaluatePolicyGate,
        explainPolicy,
    };
}
