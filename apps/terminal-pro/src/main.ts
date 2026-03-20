// @ts-nocheck
// This file was converted from TypeScript to JavaScript during refactoring.
// The build expects a .ts file, but the content is JavaScript.
// TODO: Either convert back to TypeScript or set up separate JavaScript build pipeline.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, dialog, webContents } from 'electron/main';
import { shell } from 'electron/common';
const require = createRequire(import.meta.url);
import { verifyLicense } from './license.js';
import { getOrCreateDeviceId } from './main/license/deviceId.js';
import { getCachedEmail, setCachedEmail } from './main/license/emailStore.js';
import { featureFlags } from './feature-flags.js';
import { StructuredSessionStore } from './structured-session.js';
import { PersonalityStore } from './personality.js';
import { redactText } from '@rinawarp/safety/redaction';
import { detectCommandBoundaries } from './prompt-boundary.js';
import { defaultProfileForProject, gateCommandRun, summarizeProfile } from './agent-profile.js';
import { loadProjectRules, rulesToSystemBlock } from './rules-loader.js';
import { scoreTextMatch } from './search-ranking.js';
import { riskFromPlanStep } from './plan-risk.js';
import { registerIpcHandlers, setDaemonFunctions, setLicenseFunctions } from './main/ipc/index.js';
import { registerPtyHandlers } from './main/pty/ptyController.js';
import { registerSecureAgentIpc } from './main/ipc/secure-agent.js';
import { registerAgentExecutionIpc } from './main/ipc/registerAgentExecutionIpc.js';
import { resolveResourcePath as resolveMainResourcePath } from './main/resources.js';
import { initAnalytics, trackFunnelStep } from './analytics.js';
import { handleRinaMessage, rinaController } from './rina/index.js';
import { thinkingStream } from './rina/thinking/thinkingStream.js';
import { listStructuredRunsFromSessionsRoot, readStructuredRunTailFromSessionsRoot } from './main/runs/structuredRuns.js';
import { canonicalizePath, isWithinRoot, normalizeProjectRoot as normalizeProjectRootFromSecurity, resolveProjectRootSafe as resolveProjectRootSafeFromSecurity, } from './security/projectRoot.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_PROJECT_ROOT, '..', '..');
const ALLOWED_WORKSPACE_ROOTS = [];
function normalizeProjectRoot(input, workspaceRoot) {
    return normalizeProjectRootFromSecurity({
        input,
        workspaceRoot,
        allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
    });
}
function resolveProjectRootSafe(input) {
    return resolveProjectRootSafeFromSecurity({
        input,
        allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
    });
}
import { ExecutionEngine, } from '@rinawarp/core/enforcement/index.js';
import { createStandardRegistry } from '@rinawarp/core/tools/registry.js';
import { executeViaEngine } from '@rinawarp/core/adapters/unify-execution.js';
const registry = createStandardRegistry();
const engine = new ExecutionEngine(registry);
let structuredSessionStore = null;
const personalityStore = new PersonalityStore();
const ctx = {
    structuredSessionStore: null,
    lastLoadedThemePath: null,
    lastLoadedPolicyPath: null,
};
let currentLicenseTier = 'starter';
let currentLicenseToken = null;
let currentLicenseExpiresAt = null;
let currentLicenseCustomerId = null;
const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || 'http://127.0.0.1:5055';
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || '';
const IS_E2E = process.env.RINAWARP_E2E === '1';
if (IS_E2E && process.env.RINAWARP_E2E_USER_DATA_SUFFIX) {
    app.setPath('userData', path.join(app.getPath('temp'), `rinawarp-e2e-${process.env.RINAWARP_E2E_USER_DATA_SUFFIX}`));
}
if (app.isPackaged && process.env.ELECTRON_DISABLE_SANDBOX === '1') {
    console.warn('[security] Ignoring ELECTRON_DISABLE_SANDBOX in packaged builds.');
    delete process.env.ELECTRON_DISABLE_SANDBOX;
}
const TOP_CPU_CMD_SAFE = 'ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk3 | head -15 || ps aux | head -15';
const TOP_MEM_CMD_SAFE = 'ps -eo pid,pcpu,pmem,comm --sort=-pmem 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk4 | head -15 || ps aux | head -15';
const TOP_CPU_CMD_SAFE_SHORT = 'ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -10 || ps aux 2>/dev/null | sort -nrk3 | head -10 || ps aux | head -10';
const e2ePlanPayloads = new Map();
let cachedPolicy;
const THEME_SELECTION_FILE = () => path.join(app.getPath('userData'), 'theme.json');
const CUSTOM_THEMES_FILE = () => path.join(app.getPath('userData'), 'themes.custom.json');
const ALLOWED_THEME_VAR_KEYS = new Set([
    '--rw-bg',
    '--rw-panel',
    '--rw-border',
    '--rw-text',
    '--rw-muted',
    '--rw-accent',
    '--rw-accent2',
    '--rw-danger',
    '--rw-success',
]);
function resolveResourcePath(relPath, devBase) {
    return resolveMainResourcePath({
        relPath,
        devBase,
        repoRoot: REPO_ROOT,
        appProjectRoot: APP_PROJECT_ROOT,
        dirname: __dirname,
    });
}
function warnIfUnexpectedPackagedResource(resourceName, resolvedPath) {
    if (!app.isPackaged)
        return;
    const target = canonicalizePath(resolvedPath);
    const allowedBases = [app.getAppPath(), process.resourcesPath].map((p) => canonicalizePath(p));
    const allowed = allowedBases.some((base) => isWithinRoot(target, base));
    if (!allowed) {
        console.warn(`[security] Unexpected packaged ${resourceName} path outside app/resources: ${target}`);
    }
}
function crc32(buf) {
    let crc = 0xffffffff;
    for (const b of buf) {
        crc ^= b;
        for (let i = 0; i < 8; i += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function zipFiles(files) {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;
    for (const f of files) {
        const nameBuf = Buffer.from(f.name, 'utf8');
        const dataBuf = f.data;
        const checksum = crc32(dataBuf);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt16LE(0, 10);
        local.writeUInt16LE(0, 12);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(dataBuf.length, 18);
        local.writeUInt32LE(dataBuf.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);
        const localEntry = Buffer.concat([local, nameBuf, dataBuf]);
        localHeaders.push(localEntry);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0, 8);
        central.writeUInt16LE(0, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0, 14);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(dataBuf.length, 20);
        central.writeUInt32LE(dataBuf.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);
        centralHeaders.push(Buffer.concat([central, nameBuf]));
        offset += localEntry.length;
    }
    const centralStart = offset;
    const centralBlob = Buffer.concat(centralHeaders);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralBlob.length, 12);
    eocd.writeUInt32LE(centralStart, 16);
    eocd.writeUInt16LE(0, 20);
    return Buffer.concat([...localHeaders, centralBlob, eocd]);
}
function readTailLines(filePath, maxLines) {
    try {
        if (!fs.existsSync(filePath))
            return '';
        const raw = fs.readFileSync(filePath, 'utf8');
        const lines = raw.split(/\r?\n/);
        const start = Math.max(0, lines.length - Math.max(1, maxLines));
        return lines.slice(start).join('\n');
    }
    catch {
        return '';
    }
}
async function showSaveDialogForBundle(defaultPath) {
    if (IS_E2E) {
        return {
            canceled: false,
            filePath: path.join(app.getPath('temp'), `rinawarp-support-bundle-e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.zip`),
        };
    }
    return dialog.showSaveDialog({
        title: 'Save Support Bundle',
        defaultPath,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
    });
}
function readJsonIfExists(p) {
    try {
        if (!fs.existsSync(p))
            return null;
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    catch {
        return null;
    }
}
function writeJsonFile(p, value) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(value, null, 2), 'utf-8');
}
function loadSharesDb() {
    const parsed = readJsonIfExists(SHARES_FILE()) ?? { shares: [] };
    const normalized = (parsed.shares || []).map((s) => {
        const createdAt = s.createdAt || new Date().toISOString();
        const expiresAt = s.expiresAt || new Date(Date.parse(createdAt) + 7 * 24 * 60 * 60 * 1000).toISOString();
        return {
            id: s.id,
            createdAt,
            createdBy: s.createdBy || 'owner@local',
            title: s.title,
            content: s.content || '',
            revoked: !!s.revoked,
            expiresAt,
            requiredRole: s.requiredRole || 'viewer',
        };
    });
    return { shares: normalized };
}
function saveSharesDb(db) {
    writeJsonFile(SHARES_FILE(), db);
}
function loadTeamDb() {
    return (readJsonIfExists(TEAM_FILE()) ?? {
        currentUser: 'owner@local',
        members: [{ email: 'owner@local', role: 'owner' }],
    });
}
function saveTeamDb(db) {
    writeJsonFile(TEAM_FILE(), db);
}
function loadTeamInvitesDb() {
    const parsed = readJsonIfExists(TEAM_INVITES_FILE()) ?? { invites: [] };
    const nowMs = Date.now();
    const normalized = (parsed.invites || []).map((inv) => {
        const expiresAt = inv.expiresAt || new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
        const expired = Date.parse(expiresAt) <= nowMs;
        const status = inv.status === 'accepted' || inv.status === 'revoked' ? inv.status : expired ? 'expired' : 'pending';
        return {
            id: inv.id || `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            token: inv.token || '',
            email: String(inv.email || '')
                .trim()
                .toLowerCase(),
            role: inv.role && ['owner', 'operator', 'viewer'].includes(inv.role) ? inv.role : 'viewer',
            createdAt: inv.createdAt || new Date().toISOString(),
            createdBy: inv.createdBy || 'owner@local',
            expiresAt,
            status,
            acceptedAt: inv.acceptedAt,
            acceptedBy: inv.acceptedBy,
        };
    });
    return { invites: normalized };
}
function saveTeamInvitesDb(db) {
    writeJsonFile(TEAM_INVITES_FILE(), db);
}
function loadTeamActivity(limit = 200) {
    try {
        const p = TEAM_ACTIVITY_FILE();
        if (!fs.existsSync(p))
            return [];
        const raw = fs.readFileSync(p, 'utf-8');
        const lines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const parsed = [];
        for (const line of lines) {
            try {
                const rec = JSON.parse(line);
                if (!rec || !rec.id || !rec.timestamp || !rec.actor || !rec.action || !rec.target)
                    continue;
                parsed.push(rec);
            }
            catch {
            }
        }
        return parsed.slice(-Math.max(1, Math.floor(limit))).reverse();
    }
    catch {
        return [];
    }
}
function appendTeamActivity(action, target, details) {
    try {
        const rec = {
            id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            actor: getCurrentUserEmail(),
            actorRole: getCurrentRole(),
            action,
            target: String(target || 'unknown'),
            details,
        };
        fs.mkdirSync(path.dirname(TEAM_ACTIVITY_FILE()), { recursive: true });
        fs.appendFileSync(TEAM_ACTIVITY_FILE(), `${JSON.stringify(rec)}\n`, 'utf-8');
    }
    catch {
    }
}
function getCurrentRole() {
    const team = loadTeamDb();
    const user = team.currentUser || 'owner@local';
    const role = team.members.find((m) => m.email === user)?.role;
    return role || 'owner';
}
function getCurrentUserEmail() {
    const team = loadTeamDb();
    return team.currentUser || 'owner@local';
}
function roleRank(role) {
    if (role === 'owner')
        return 3;
    if (role === 'operator')
        return 2;
    return 1;
}
function hasRoleAtLeast(current, required) {
    return roleRank(current) >= roleRank(required);
}
function safeSend(target, channel, payload) {
    if (!target)
        return false;
    try {
        if (target.isDestroyed())
            return false;
        target.send(channel, payload);
        return true;
    }
    catch {
        return false;
    }
}
function importShellHistory(limit = 300) {
    const home = process.env.HOME || os.homedir();
    const files = [
        path.join(home, '.bash_history'),
        path.join(home, '.zsh_history'),
        path.join(home, '.local', 'share', 'fish', 'fish_history'),
    ];
    const out = [];
    const seen = new Set();
    for (const file of files) {
        if (!fs.existsSync(file))
            continue;
        let raw = '';
        try {
            raw = fs.readFileSync(file, 'utf-8');
        }
        catch {
            continue;
        }
        for (const line of raw.split(/\r?\n/)) {
            let cmd = String(line || '').trim();
            if (!cmd)
                continue;
            if (cmd.startsWith(': ')) {
                const idx = cmd.indexOf(';');
                if (idx > -1)
                    cmd = cmd.slice(idx + 1).trim();
            }
            if (cmd.includes('- cmd:'))
                continue;
            if (cmd.startsWith('- cmd:'))
                cmd = cmd.replace(/^- cmd:\s*/, '').trim();
            if (!cmd || cmd.length < 2)
                continue;
            if (!seen.has(cmd)) {
                seen.add(cmd);
                out.push(cmd);
            }
        }
    }
    const picked = out.slice(-Math.max(10, Math.min(limit, 2000)));
    return { imported: picked.length, commands: picked };
}
function fallbackThemeRegistry() {
    return {
        themes: [
            {
                id: 'mermaid-teal',
                name: 'Mermaid - Teal',
                group: 'Mermaid',
                vars: {
                    '--rw-bg': '#061013',
                    '--rw-panel': 'rgba(255,255,255,0.03)',
                    '--rw-border': 'rgba(255,255,255,0.10)',
                    '--rw-text': 'rgba(255,255,255,0.92)',
                    '--rw-muted': 'rgba(255,255,255,0.68)',
                    '--rw-accent': '#2de2e6',
                    '--rw-accent2': '#7af3f5',
                    '--rw-danger': '#ff4d6d',
                    '--rw-success': '#3cffb5',
                },
                terminal: {
                    background: '#061013',
                    foreground: '#eaffff',
                    cursor: '#2de2e6',
                    selection: 'rgba(45, 226, 230, 0.18)',
                    ansi: [
                        '#07161a',
                        '#ff4d6d',
                        '#3cffb5',
                        '#ffd166',
                        '#61a0ff',
                        '#b57bff',
                        '#2de2e6',
                        '#eaffff',
                        '#23454f',
                        '#ff7aa2',
                        '#7bffd9',
                        '#ffe199',
                        '#92c0ff',
                        '#d3a8ff',
                        '#7af3f5',
                        '#ffffff',
                    ],
                },
            },
            {
                id: 'unicorn',
                name: 'Unicorn',
                group: 'Fantasy',
                vars: {
                    '--rw-bg': '#070614',
                    '--rw-panel': 'rgba(255,255,255,0.035)',
                    '--rw-border': 'rgba(255,255,255,0.11)',
                    '--rw-text': 'rgba(255,255,255,0.93)',
                    '--rw-muted': 'rgba(255,255,255,0.70)',
                    '--rw-accent': '#b57bff',
                    '--rw-accent2': '#ff3bbf',
                    '--rw-danger': '#ff4d6d',
                    '--rw-success': '#3cffb5',
                },
                terminal: {
                    background: '#070614',
                    foreground: '#f7e9ff',
                    cursor: '#ff3bbf',
                    selection: 'rgba(181, 123, 255, 0.20)',
                    ansi: [
                        '#12102a',
                        '#ff4d6d',
                        '#3cffb5',
                        '#ffd166',
                        '#61a0ff',
                        '#b57bff',
                        '#ff3bbf',
                        '#f7e9ff',
                        '#3b2a4a',
                        '#ff7aa2',
                        '#7bffd9',
                        '#ffe199',
                        '#92c0ff',
                        '#d3a8ff',
                        '#ff7ad9',
                        '#ffffff',
                    ],
                },
            },
        ],
    };
}
function loadBaseThemeRegistry() {
    const file = resolveResourcePath('themes/themes.json', 'app');
    warnIfUnexpectedPackagedResource('theme registry', file);
    const parsed = readJsonIfExists(file);
    if (parsed?.themes?.length) {
        ctx.lastLoadedThemePath = file;
        return parsed;
    }
    ctx.lastLoadedThemePath = null;
    return fallbackThemeRegistry();
}
function loadCustomThemeRegistry() {
    return readJsonIfExists(CUSTOM_THEMES_FILE()) ?? { themes: [] };
}
function loadThemeRegistryMerged() {
    const base = loadBaseThemeRegistry();
    const custom = loadCustomThemeRegistry();
    const map = new Map();
    for (const t of base.themes || [])
        map.set(t.id, t);
    for (const t of custom.themes || [])
        map.set(t.id, t);
    return { themes: Array.from(map.values()) };
}
function loadSelectedThemeId() {
    const data = readJsonIfExists(THEME_SELECTION_FILE());
    return data?.id || 'mermaid-teal';
}
function saveSelectedThemeId(id) {
    writeJsonFile(THEME_SELECTION_FILE(), { id });
}
function validateTheme(theme) {
    if (!theme?.id || !/^[a-z0-9-]{3,64}$/i.test(theme.id))
        return { ok: false, error: 'Invalid id' };
    if (!theme?.name || theme.name.length < 2)
        return { ok: false, error: 'Invalid name' };
    if (!theme?.vars || typeof theme.vars !== 'object')
        return { ok: false, error: 'Missing vars' };
    for (const key of Object.keys(theme.vars)) {
        if (!ALLOWED_THEME_VAR_KEYS.has(key))
            return { ok: false, error: `Disallowed var: ${key}` };
        if (typeof theme.vars[key] !== 'string')
            return { ok: false, error: `Var not string: ${key}` };
    }
    if (theme.terminal) {
        if (!theme.terminal.background || !theme.terminal.foreground) {
            return { ok: false, error: 'Terminal bg/fg required' };
        }
        if (!Array.isArray(theme.terminal.ansi) || theme.terminal.ansi.length !== 16) {
            return { ok: false, error: 'Terminal ansi must have 16 colors' };
        }
    }
    return { ok: true };
}
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
function mapApiTierToLicenseTier(apiTier) {
    const t = apiTier.trim().toLowerCase();
    if (t === 'pro')
        return 'pro';
    if (t === 'creator')
        return 'creator';
    if (t === 'pioneer')
        return 'pioneer';
    if (t === 'founder')
        return 'founder';
    if (t === 'enterprise')
        return 'enterprise';
    if (t === 'team')
        return 'enterprise';
    return 'starter';
}
function applyVerifiedLicense(data) {
    const tier = mapApiTierToLicenseTier(data.tier);
    currentLicenseTier = tier;
    currentLicenseToken = data.license_token ?? null;
    currentLicenseExpiresAt = Number.isFinite(data.expires_at) ? data.expires_at : null;
    currentLicenseCustomerId = data.customer_id ?? null;
    currentLicenseStatus = data.status ?? 'active';
    return tier;
}
function resetLicenseToStarter() {
    currentLicenseTier = 'starter';
    currentLicenseToken = null;
    currentLicenseExpiresAt = null;
    currentLicenseCustomerId = null;
}
function getLicenseState() {
    return {
        tier: currentLicenseTier,
        has_token: !!currentLicenseToken,
        expires_at: currentLicenseExpiresAt,
        customer_id: currentLicenseCustomerId,
        status: currentLicenseStatus,
    };
}
function getCurrentLicenseCustomerId() {
    return currentLicenseCustomerId;
}
async function refreshLicenseState() {
    if (!currentLicenseCustomerId) {
        return getLicenseState();
    }
    const data = await verifyLicense(currentLicenseCustomerId, { force: true });
    if (!data?.ok) {
        throw new Error('license refresh returned non-ok response');
    }
    applyVerifiedLicense(data);
    saveEntitlements();
    return getLicenseState();
}
function buildAgentdHeaders(opts) {
    const headers = {
        'content-type': 'application/json',
    };
    if (AGENTD_AUTH_TOKEN) {
        headers.authorization = `Bearer ${AGENTD_AUTH_TOKEN}`;
    }
    if (opts?.includeLicenseToken && currentLicenseToken) {
        headers['x-rinawarp-license-token'] = currentLicenseToken;
    }
    return headers;
}
async function agentdJson(path, init) {
    const res = await fetch(`${AGENTD_BASE_URL}${path}`, {
        method: init.method,
        headers: buildAgentdHeaders({ includeLicenseToken: init.includeLicenseToken }),
        body: init.body ? JSON.stringify(init.body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    }
    catch {
        data = null;
    }
    if (!res.ok) {
        const msg = data?.error || `${init.method} ${path} failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
}
async function daemonStatus() {
    try {
        return await agentdJson('/v1/daemon/status', {
            method: 'GET',
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            daemon: { running: false, pid: null, storeDir: null },
            tasks: { total: 0, counts: {} },
        };
    }
}
async function daemonTasks(args) {
    const q = new URLSearchParams();
    if (args?.status)
        q.set('status', args.status);
    if (args?.deadLetter)
        q.set('deadLetter', '1');
    const suffix = q.size > 0 ? `?${q.toString()}` : '';
    try {
        return await agentdJson(`/v1/daemon/tasks${suffix}`, {
            method: 'GET',
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            tasks: [],
        };
    }
}
async function daemonTaskAdd(args) {
    try {
        return await agentdJson('/v1/daemon/tasks', {
            method: 'POST',
            body: {
                type: args?.type,
                payload: args?.payload ?? {},
                maxAttempts: args?.maxAttempts,
            },
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function daemonStart() {
    try {
        return await agentdJson('/v1/daemon/start', {
            method: 'POST',
            body: {},
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function daemonStop() {
    try {
        return await agentdJson('/v1/daemon/stop', {
            method: 'POST',
            body: {},
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function fetchRemotePlanForIpc(payload) {
    if (IS_E2E) {
        const localPlan = makePlan(payload.intentText, payload.projectRoot);
        return {
            id: localPlan.id,
            reasoning: localPlan.reasoning,
            steps: localPlan.steps.map((step) => ({
                stepId: step.id,
                tool: 'terminal.write',
                input: {
                    command: step.command,
                    cwd: payload.projectRoot,
                    timeoutMs: 60_000,
                },
                ...terminalWriteSafetyFields(step.risk),
                description: step.description ?? step.command,
                verification_plan: { steps: [] },
            })),
        };
    }
    const resp = await agentdJson('/v1/plan', {
        method: 'POST',
        body: payload,
        includeLicenseToken: false,
    });
    return resp.plan;
}
async function executeRemotePlanForIpc(payload) {
    if (IS_E2E) {
        const planRunId = `e2e_plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        e2ePlanPayloads.set(planRunId, payload);
        return { ok: true, planRunId };
    }
    return await agentdJson('/v1/execute-plan', {
        method: 'POST',
        body: payload,
        includeLicenseToken: true,
    });
}
async function orchestratorIssueToPrForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/issue-to-pr', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function orchestratorGraphForIpc() {
    try {
        return await agentdJson('/v1/orchestrator/workspace-graph', {
            method: 'GET',
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            graph: { nodes: [], edges: [] },
        };
    }
}
async function orchestratorPrepareBranchForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/git/prepare-branch', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function orchestratorCreatePrForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/github/create-pr', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function orchestratorPrStatusForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/github/pr-status', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function orchestratorWebhookAuditForIpc(args) {
    try {
        const role = getCurrentRole();
        if (!hasRoleAtLeast(role, 'operator')) {
            return {
                ok: false,
                error: 'Only owner/operator can access webhook audit events.',
                entries: [],
                count: 0,
            };
        }
        const params = new URLSearchParams();
        if (typeof args?.limit === 'number' && Number.isFinite(args.limit))
            params.set('limit', String(args.limit));
        if (args?.outcome)
            params.set('outcome', args.outcome);
        if (args?.mapped)
            params.set('mapped', args.mapped);
        const qs = params.toString();
        const path = qs ? `/v1/orchestrator/github/webhook-audit?${qs}` : '/v1/orchestrator/github/webhook-audit';
        return await agentdJson(path, {
            method: 'GET',
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            entries: [],
            count: 0,
        };
    }
}
async function orchestratorCiStatusForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/ci/status', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function orchestratorReviewCommentForIpc(args) {
    try {
        return await agentdJson('/v1/orchestrator/review/comment', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
function gateProfileCommand(args) {
    const profile = defaultProfileForProject(args.projectRoot);
    const result = gateCommandRun({
        profile,
        command: args.command,
        risk: args.risk,
        confirmed: args.confirmed,
        confirmationText: args.confirmationText,
    });
    if (!result.ok) {
        const errMsg = result.message;
        return { ok: false, message: `[profile] ${errMsg}` };
    }
    return { ok: true };
}
const PLAYBOOKS = [
    {
        id: 'running-hot',
        name: 'System Running Hot',
        description: 'Diagnose and fix CPU/temperature issues',
        category: 'performance',
        signals: ['high cpu load', 'fan noise', 'overheating', 'temperature'],
        interpretationRules: [
            {
                pattern: /load average.*([5-9]\.[0-9]|1[0-9])/,
                message: 'Critical load: system is severely overloaded',
                severity: 'critical',
            },
            { pattern: /load average.*([2-4]\.[0-9])/, message: 'High load: CPU pressure detected', severity: 'warning' },
            {
                pattern: /%Cpu\(s\):.*wa.*([5-9][0-9]\.[0-9])/,
                message: 'High iowait: disk/IO bottleneck',
                severity: 'warning',
            },
            { pattern: /Processes.*blocked.*[5-9][0-9]+/, message: 'Many processes blocked on IO', severity: 'warning' },
        ],
        gatherCommands: [
            { command: 'uptime', description: 'System load average', timeout: 5000 },
            { command: 'cat /proc/loadavg', description: 'Detailed load stats', timeout: 5000 },
            { command: TOP_CPU_CMD_SAFE.replaceAll('head -15', 'head -20'), description: 'Top CPU processes', timeout: 8000 },
            { command: 'free -h', description: 'Memory usage', timeout: 5000 },
            {
                command: "sensors 2>/dev/null || echo 'No sensors available'",
                description: 'Temperature sensors',
                timeout: 8000,
            },
        ],
        fixOptions: [
            {
                name: 'Identify CPU hogs',
                description: 'Find and analyze processes consuming excessive CPU',
                risk: 'read',
                commands: [TOP_CPU_CMD_SAFE],
                verification: 'Process list shows CPU consumers',
            },
            {
                name: 'Check memory pressure',
                description: 'Investigate if memory is causing swap thrashing',
                risk: 'read',
                commands: ['free -h', "cat /proc/meminfo | grep -E '(MemAvailable|SwapTotal|SwapFree)'"],
                verification: 'Memory statistics available',
            },
            {
                name: 'Review system services',
                description: 'Check for runaway services',
                risk: 'read',
                commands: ['systemctl list-units --type=service --state=running --no-pager -o unit,active,substate | head -20'],
                verification: 'Service list available',
            },
        ],
        escalationCondition: 'If temperature sensors show critical temperatures (>90°C), advise immediate action',
    },
    {
        id: 'disk-full',
        name: 'Disk Full',
        description: 'Find and clear disk space',
        category: 'cleanup',
        signals: ['disk full', 'no space', 'disk space', 'running out of space'],
        interpretationRules: [
            { pattern: /(100%|[9][0-9]%\s)/, message: 'Disk is critically full', severity: 'critical' },
            { pattern: /([7-8][0-9]%\s)/, message: 'Disk is mostly full', severity: 'warning' },
            { pattern: /([5-6][0-9]%\s)/, message: 'Disk is getting full', severity: 'info' },
        ],
        gatherCommands: [
            { command: "df -h | grep -E '(Filesystem|/dev/)'", description: 'Disk usage by mount', timeout: 5000 },
            {
                command: 'du -sh /var/* 2>/dev/null | sort -h | tail -10',
                description: 'Largest var directories',
                timeout: 15000,
            },
            { command: 'du -sh /home/* 2>/dev/null | sort -h | tail -10', description: 'Largest home dirs', timeout: 15000 },
            { command: "du -sh ~/.cache 2>/dev/null || echo 'No cache dir'", description: 'Cache size', timeout: 10000 },
            {
                command: "docker system df 2>/dev/null || echo 'Docker not available'",
                description: 'Docker disk usage',
                timeout: 10000,
            },
        ],
        fixOptions: [
            {
                name: 'Clean apt cache',
                description: 'Clear apt package cache',
                risk: 'safe-write',
                commands: ['sudo apt autoremove -y', 'sudo apt clean'],
                verification: 'Apt cache cleaned',
            },
            {
                name: 'Clear user cache',
                description: 'Clear ~/.cache directory',
                risk: 'safe-write',
                commands: [
                    "du -sh ~/.cache 2>/dev/null || echo 'No cache'",
                    "rm -rf ~/.cache/* 2>/dev/null || echo 'Nothing to clear'",
                ],
                verification: 'User cache cleared',
            },
            {
                name: 'Docker cleanup',
                description: 'Clean unused Docker data',
                risk: 'high-impact',
                commands: ['docker system df', 'docker system prune -f'],
                verification: 'Docker disk space freed',
            },
            {
                name: 'Find large files',
                description: 'Locate largest files for manual review',
                risk: 'read',
                commands: ['find /home -type f -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -h | tail -20'],
                verification: 'Large files listed',
            },
        ],
        escalationCondition: 'If disk is >95% full, prioritize immediate cleanup actions',
    },
    {
        id: 'docker-space',
        name: 'Docker Space',
        description: 'Clean Docker disk usage',
        category: 'cleanup',
        signals: ['docker', 'container', 'image', 'docker-compose'],
        interpretationRules: [
            { pattern: /Images.*([5-9][0-9]+)/, message: 'Many unused images', severity: 'warning' },
            { pattern: /Containers.*([5-9][0-9]+).*created/, message: 'Many stopped containers', severity: 'info' },
            { pattern: /Reclaimable.*([5-9][0-9]+%)/, message: 'Significant space can be reclaimed', severity: 'warning' },
        ],
        gatherCommands: [
            { command: 'docker system df', description: 'Docker disk usage breakdown', timeout: 10000 },
            { command: 'docker system df -v 2>/dev/null | head -30', description: 'Detailed Docker stats', timeout: 15000 },
            { command: 'docker images -f dangling=true -q | wc -l', description: 'Dangling images count', timeout: 5000 },
            { command: 'docker ps -a -f status=exited -q | wc -l', description: 'Stopped containers count', timeout: 5000 },
        ],
        fixOptions: [
            {
                name: 'Docker system prune',
                description: 'Remove all unused data (images, containers, volumes)',
                risk: 'high-impact',
                commands: ['docker system df', 'docker system prune -af'],
                verification: 'Docker system pruned',
            },
            {
                name: 'Clean dangling images',
                description: 'Remove dangling images only',
                risk: 'safe-write',
                commands: ['docker image prune -f'],
                verification: 'Dangling images removed',
            },
            {
                name: 'Remove stopped containers',
                description: 'Remove all stopped containers',
                risk: 'safe-write',
                commands: ['docker container prune -f'],
                verification: 'Stopped containers removed',
            },
        ],
        escalationCondition: 'If volumes have important data, ask user before pruning',
    },
    {
        id: 'laptop-slow',
        name: 'Laptop Slow',
        description: 'Diagnose performance issues on laptop',
        category: 'performance',
        signals: ['slow', 'lag', 'performance', 'laptop', 'freezing'],
        interpretationRules: [
            { pattern: /load average.*([3-9]\.[0-9])/, message: 'High system load', severity: 'warning' },
            { pattern: /MiB Mem :.*[0-9]+.*[0-9]+.*([0-9]+)%.*/, message: 'High memory usage', severity: 'warning' },
            { pattern: /battery/i, message: 'Check power settings', severity: 'info' },
        ],
        gatherCommands: [
            { command: 'uptime', description: 'Load average', timeout: 5000 },
            { command: 'free -h', description: 'Memory usage', timeout: 5000 },
            { command: TOP_CPU_CMD_SAFE, description: 'Top processes', timeout: 8000 },
            { command: 'cat /proc/loadavg', description: 'Detailed load', timeout: 5000 },
            { command: 'systemctl status 2>/dev/null | head -20', description: 'Systemd status', timeout: 10000 },
        ],
        fixOptions: [
            {
                name: 'Check for memory hogs',
                description: 'Find processes using most memory',
                risk: 'read',
                commands: [TOP_MEM_CMD_SAFE],
                verification: 'Memory hogs identified',
            },
            {
                name: 'Review running services',
                description: 'Check for unnecessary services',
                risk: 'read',
                commands: [
                    'systemctl list-units --type=service --state=running --no-pager | wc -l',
                    'systemctl list-units --type=service --state=running --no-pager',
                ],
                verification: 'Service list available',
            },
        ],
        escalationCondition: 'If memory usage >90%, suggest closing applications or adding RAM',
    },
    {
        id: 'port-in-use',
        name: 'Port In Use',
        description: 'Diagnose and resolve port conflicts',
        category: 'diagnose',
        signals: ['port', 'address already in use', 'eaddrinuse', 'bind failed'],
        interpretationRules: [
            { pattern: /:([0-9]+)\s+.*already in use/i, message: 'Port is occupied', severity: 'warning' },
            { pattern: /EADDRINUSE/i, message: 'Address already in use', severity: 'warning' },
        ],
        gatherCommands: [
            { command: "ss -tlnp | grep -E ':[0-9]+'", description: 'Listening ports', timeout: 5000 },
            {
                command: 'lsof -i :PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep PORT',
                description: 'Process on specific port',
                timeout: 5000,
            },
            {
                command: "ps aux | grep -E 'node|python|go|java|ruby' | grep -v grep",
                description: 'Common dev processes',
                timeout: 8000,
            },
        ],
        fixOptions: [
            {
                name: 'Find process on port',
                description: "Identify what's using the port",
                risk: 'read',
                commands: ['lsof -i :PORT 2>/dev/null || ss -tlnp | grep PORT'],
                verification: 'Process identified',
            },
            {
                name: 'Kill process on port',
                description: 'Terminate process using the port (careful!)',
                risk: 'high-impact',
                commands: ["kill $(lsof -t -i:PORT) 2>/dev/null || echo 'Could not identify process'"],
                verification: 'Process terminated',
            },
        ],
        escalationCondition: 'If process belongs to critical service, advise caution',
    },
];
const operationalMemory = {
    storage: new Map(),
    get(category, key) {
        return this.storage.get(category)?.get(key);
    },
    set(category, key, value) {
        if (!this.storage.has(category)) {
            this.storage.set(category, new Map());
        }
        this.storage.get(category).set(key, {
            value,
            timestamp: Date.now(),
            successCount: (this.get(category, key)?.successCount || 0) + 1,
        });
    },
    getRecent(category, limit = 5) {
        const items = this.storage.get(category);
        if (!items)
            return [];
        const arr = Array.from(items.values());
        return arr.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },
};
const sessionState = {
    id: `session_${Date.now()}`,
    startTime: new Date().toISOString(),
    entries: [],
    playbookResults: new Map(),
};
function withStructuredSessionWrite(fn) {
    if (!structuredSessionStore)
        return;
    try {
        fn();
    }
    catch {
    }
}
function ensureStructuredSession(args) {
    if (!structuredSessionStore)
        return null;
    try {
        return structuredSessionStore.startSession(args);
    }
    catch {
        return null;
    }
}
function sanitizeForPersistence(value) {
    if (typeof value === 'string') {
        return redactText(value).redactedText;
    }
    if (Array.isArray(value)) {
        return value.map((v) => sanitizeForPersistence(v));
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = sanitizeForPersistence(v);
        }
        return out;
    }
    return value;
}
function addTranscriptEntry(entry) {
    sessionState.entries.push(sanitizeForPersistence(entry));
}
function getSessionTranscript() {
    return {
        sessionId: sessionState.id,
        startTime: sessionState.startTime,
        endTime: new Date().toISOString(),
        entries: sessionState.entries,
        playbookResults: Object.fromEntries(sessionState.playbookResults),
    };
}
function exportTranscript(format) {
    const transcript = getSessionTranscript();
    if (format === 'json') {
        return redactText(JSON.stringify(transcript, null, 2)).redactedText;
    }
    let text = `RinaWarp Session Report\n`;
    text += `${'='.repeat(50)}\n`;
    text += `Session: ${transcript.sessionId}\n`;
    text += `Started: ${transcript.startTime}\n`;
    text += `Ended: ${transcript.endTime}\n\n`;
    let stepNum = 0;
    for (const entry of transcript.entries) {
        switch (entry.type) {
            case 'intent':
                text += `\n## Intent\n${entry.intent}\n`;
                break;
            case 'playbook':
                text += `\n## Playbook: ${entry.playbookName}\n`;
                break;
            case 'signal':
                text += `\n## Signal Detected\n${entry.signal}\n→ ${entry.interpretation}\n`;
                break;
            case 'plan':
                text += `\n## Plan\n${entry.plan.reasoning}\n\n`;
                entry.plan.steps.forEach((s, i) => {
                    text += `${i + 1}. [${s.risk}] ${s.command}\n`;
                });
                break;
            case 'approval':
                text += `\n## Approval: ${entry.stepId}\n`;
                text += `Command: ${entry.command}\n`;
                text += `Risk: ${entry.risk}\n`;
                text += `Approved: ${entry.approved ? 'Yes' : 'No'}\n`;
                break;
            case 'execution_start':
                stepNum++;
                text += `\n## Step ${stepNum}: ${entry.command}\n`;
                break;
            case 'execution_end':
                text += `Result: ${entry.ok ? 'Success' : 'Failed: ' + (entry.error || 'unknown')}\n`;
                break;
            case 'verification':
                text += `\n## Verification: ${entry.check}\n`;
                text += `Status: ${entry.status.toUpperCase()}\n`;
                text += `Result: ${entry.result}\n`;
                break;
            case 'outcome':
                text += `\n## OUTCOME CARD\n`;
                text += `Root Cause: ${entry.rootCause}\n`;
                text += `Changes: ${entry.changes.join(', ')}\n`;
                text += `Confidence: ${entry.confidence.toUpperCase()}\n`;
                text += `\nEvidence Before:\n${entry.evidenceBefore}\n`;
                text += `\nEvidence After:\n${entry.evidenceAfter}\n`;
                break;
            case 'memory':
                text += `\n## Memory Stored\nCategory: ${entry.category}\nKey: ${entry.key}\n`;
                break;
        }
    }
    return redactText(text).redactedText;
}
function recencyBoost(iso) {
    const ts = Date.parse(String(iso || ''));
    if (!Number.isFinite(ts))
        return 0;
    const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
    if (ageHours <= 1)
        return 2;
    if (ageHours <= 24)
        return 1;
    if (ageHours <= 24 * 7)
        return 0.5;
    return 0;
}
function searchTranscriptEntries(query, limit) {
    const out = [];
    const q = String(query || '').trim();
    const entries = sessionState.entries.slice(-500).reverse();
    for (const entry of entries) {
        let label = '';
        let meta = `transcript • ${entry.type}`;
        let haystack = '';
        let command;
        if (entry.type === 'execution_start') {
            label = entry.command;
            command = entry.command;
            meta = `transcript • command • ${entry.stepId}`;
            haystack = `${entry.command} ${entry.stepId}`;
        }
        else if (entry.type === 'intent') {
            label = entry.intent;
            haystack = entry.intent;
            meta = 'transcript • intent';
        }
        else if (entry.type === 'signal') {
            label = entry.signal;
            haystack = `${entry.signal} ${entry.interpretation}`;
            meta = 'transcript • signal';
        }
        else if (entry.type === 'verification') {
            label = `${entry.check}: ${entry.status}`;
            haystack = `${entry.check} ${entry.result} ${entry.status}`;
            meta = 'transcript • verification';
        }
        else if (entry.type === 'outcome') {
            label = `Outcome: ${entry.rootCause}`;
            haystack = `${entry.rootCause} ${entry.changes.join(' ')} ${entry.evidenceBefore} ${entry.evidenceAfter}`;
            meta = `transcript • outcome • ${entry.confidence}`;
        }
        else if (entry.type === 'playbook') {
            label = entry.playbookName;
            haystack = `${entry.playbookName} ${entry.playbookId}`;
            meta = 'transcript • playbook';
        }
        else if (entry.type === 'approval') {
            label = entry.command;
            command = entry.command;
            haystack = `${entry.command} ${entry.risk} ${entry.approved ? 'approved' : 'denied'}`;
            meta = `transcript • approval • ${entry.risk}`;
        }
        else if (entry.type === 'memory') {
            label = `${entry.category}: ${entry.key}`;
            haystack = `${entry.category} ${entry.key} ${entry.value}`;
            meta = 'transcript • memory';
        }
        else if (entry.type === 'execution_end') {
            label = entry.ok ? 'Execution success' : `Execution failed: ${entry.error || 'unknown'}`;
            haystack = `${entry.error || ''} ${entry.ok ? 'success' : 'failed'}`;
            meta = 'transcript • execution end';
        }
        else if (entry.type === 'plan') {
            label = entry.plan.intent || entry.plan.reasoning;
            haystack = `${entry.plan.intent} ${entry.plan.reasoning} ${(entry.plan.steps || []).map((s) => s.command).join(' ')}`;
            meta = 'transcript • plan';
        }
        if (!label)
            continue;
        const score = scoreTextMatch(q, haystack);
        if (q && score < 0)
            continue;
        const total = (score > 0 ? score : 0.05) + recencyBoost(entry.timestamp);
        out.push({
            id: `transcript:${entry.timestamp}:${entry.type}:${out.length}`,
            source: 'transcript',
            label,
            meta,
            snippet: haystack.slice(0, 220),
            command,
            createdAt: entry.timestamp,
            score: Number(total.toFixed(4)),
        });
        if (out.length >= Math.max(5, limit * 2))
            break;
    }
    return out;
}
function searchShareRecords(query, limit) {
    const out = [];
    const q = String(query || '').trim();
    const role = getCurrentRole();
    const shares = loadSharesDb()
        .shares.filter((s) => hasRoleAtLeast(role, s.requiredRole))
        .slice(0, 250);
    for (const s of shares) {
        const label = s.title || `Share ${s.id}`;
        const summary = `${label}\n${s.content || ''}`;
        const score = scoreTextMatch(q, summary);
        if (q && score < 0)
            continue;
        const status = s.revoked ? 'revoked' : Date.now() > Date.parse(s.expiresAt) ? 'expired' : 'active';
        const total = (score > 0 ? score : 0.05) + recencyBoost(s.createdAt);
        out.push({
            id: `share:${s.id}`,
            source: 'share',
            label,
            meta: `share • ${status} • ${s.requiredRole}`,
            snippet: String(s.content || '').slice(0, 220),
            shareId: s.id,
            createdAt: s.createdAt,
            score: Number(total.toFixed(4)),
        });
        if (out.length >= Math.max(5, limit * 2))
            break;
    }
    return out;
}
function searchStructuredRecords(query, limit) {
    if (!structuredSessionStore)
        return [];
    const hits = structuredSessionStore.searchCommands(String(query || ''), Math.max(10, limit * 2));
    return hits.map((h) => {
        const status = h.ok === true ? 'ok' : h.ok === false ? 'failed' : 'unknown';
        const meta = `structured • ${status} • ${h.risk || 'read'} • ${h.cwd || '(default)'}`;
        const total = Number((h.score + recencyBoost(h.startedAt)).toFixed(4));
        return {
            id: `structured:${h.commandId}`,
            source: 'structured',
            label: h.command,
            meta,
            snippet: h.snippet,
            command: h.command,
            createdAt: h.startedAt,
            score: total,
        };
    });
}
function runUnifiedSearch(query, limit = 20) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
    const sourceBoost = {
        structured: 0.9,
        transcript: 0.45,
        share: 0.25,
    };
    const all = [
        ...searchStructuredRecords(query, safeLimit),
        ...searchTranscriptEntries(query, safeLimit),
        ...searchShareRecords(query, safeLimit),
    ].map((h) => ({
        ...h,
        score: Number((h.score + (sourceBoost[h.source] || 0)).toFixed(4)),
    }));
    return all
        .sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
        .slice(0, safeLimit);
}
function safeEnv(env) {
    const BLOCKED = [
        'AWS_SECRET_ACCESS_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'DATABASE_URL',
        'CF_API_TOKEN',
        'NPM_TOKEN',
        'GITHUB_TOKEN',
        'SESSION_SECRET',
        'DOWNLOAD_TOKEN_SECRET',
    ];
    const filtered = {};
    for (const [k, v] of Object.entries(env)) {
        if (!BLOCKED.includes(k) && v !== undefined)
            filtered[k] = v;
    }
    return filtered;
}
function splitCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    return { file: parts[0], args: parts.slice(1) };
}
const running = new Map();
const ptyStreamOwners = new Map();
const ptySessions = new Map();
const ptyResizeTimers = new Map();
let ptyModulePromise = null;
const SHARES_FILE = () => path.join(app.getPath('userData'), 'shares.json');
const TEAM_FILE = () => path.join(app.getPath('userData'), 'team-workspace.json');
const TEAM_INVITES_FILE = () => path.join(app.getPath('userData'), 'team-invites.json');
const TEAM_ACTIVITY_FILE = () => path.join(app.getPath('userData'), 'team-activity.ndjson');
const RENDERER_ERRORS_FILE = () => path.join(app.getPath('userData'), 'renderer-errors.ndjson');
const sharePreviewTokens = new Map();
const SHARE_PREVIEW_TTL_MS = 15 * 60 * 1000;
const exportPreviewTokens = new Map();
const EXPORT_PREVIEW_TTL_MS = 15 * 60 * 1000;
const REDACT_BEFORE_PERSIST = true;
const REDACT_BEFORE_MODEL = true;
function hashText(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
function newSharePreviewId() {
    return `shp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
function newExportPreviewId() {
    return `exp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
function pruneSharePreviewTokens(now = Date.now()) {
    for (const [id, rec] of sharePreviewTokens.entries()) {
        if (rec.expiresAtMs <= now)
            sharePreviewTokens.delete(id);
    }
}
function pruneExportPreviewTokens(now = Date.now()) {
    for (const [id, rec] of exportPreviewTokens.entries()) {
        if (rec.expiresAtMs <= now)
            exportPreviewTokens.delete(id);
    }
}
function buildAuditExportText() {
    const payload = {
        exportedAt: new Date().toISOString(),
        policyEnv: currentPolicyEnv(),
        role: getCurrentRole(),
        transcript: getSessionTranscript(),
        shares: loadSharesDb().shares.map((s) => ({
            id: s.id,
            createdAt: s.createdAt,
            createdBy: s.createdBy,
            title: s.title,
            revoked: s.revoked,
            expiresAt: s.expiresAt,
            requiredRole: s.requiredRole,
        })),
        team: loadTeamDb(),
        teamInvites: loadTeamInvitesDb().invites.map((inv) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            createdAt: inv.createdAt,
            createdBy: inv.createdBy,
            expiresAt: inv.expiresAt,
            status: inv.status,
            acceptedAt: inv.acceptedAt || null,
            acceptedBy: inv.acceptedBy || null,
        })),
        teamActivity: loadTeamActivity(1000),
    };
    return redactText(JSON.stringify(payload, null, 2)).redactedText;
}
function redactChunkIfNeeded(text) {
    if (!REDACT_BEFORE_PERSIST)
        return String(text ?? '');
    return redactText(String(text ?? '')).redactedText;
}
function forRendererDisplay(text) {
    return String(text ?? '');
}
function redactForModel(text) {
    if (!REDACT_BEFORE_MODEL)
        return String(text ?? '');
    return redactText(String(text ?? '')).redactedText;
}
function getPtyModule() {
    if (!ptyModulePromise) {
        ptyModulePromise = import('node-pty').then((mod) => mod).catch(() => null);
    }
    return ptyModulePromise;
}
function getDefaultShell() {
    if (process.platform === 'win32')
        return process.env.COMSPEC || 'cmd.exe';
    return process.env.SHELL || '/bin/bash';
}
function getDefaultPtyCwd() {
    const explicitWorkspaceRoot = String(process.env.RINA_WORKSPACE_ROOT || '').trim();
    if (explicitWorkspaceRoot) {
        return resolveProjectRootSafe(explicitWorkspaceRoot);
    }
    try {
        return resolveProjectRootSafe(APP_PROJECT_ROOT);
    }
    catch {
        return APP_PROJECT_ROOT;
    }
}
function resolvePtyCwd(input) {
    if (!input || !input.trim())
        return getDefaultPtyCwd();
    try {
        return normalizeProjectRoot(input);
    }
    catch {
        return getDefaultPtyCwd();
    }
}
const CODE_EXPLORER_SKIP_DIRS = new Set([
    '.git',
    'node_modules',
    'dist',
    'dist-electron',
    '.next',
    '.turbo',
    '.cache',
    'coverage',
]);
function listProjectFilesSafe(projectRoot, limit = 800) {
    const safeRoot = normalizeProjectRoot(projectRoot);
    const out = [];
    const max = Math.max(50, Math.min(Number(limit || 800), 5000));
    const stack = [safeRoot];
    while (stack.length > 0 && out.length < max) {
        const dir = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const ent of entries) {
            if (ent.name.startsWith('.')) {
                if (!['.env.example', '.env.local.example'].includes(ent.name))
                    continue;
            }
            const full = path.join(dir, ent.name);
            if (!isWithinRoot(full, safeRoot))
                continue;
            if (ent.isDirectory()) {
                if (CODE_EXPLORER_SKIP_DIRS.has(ent.name))
                    continue;
                stack.push(full);
                continue;
            }
            if (!ent.isFile())
                continue;
            out.push(path.relative(safeRoot, full));
            if (out.length >= max)
                break;
        }
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
}
function readProjectFileSafe(args) {
    const safeRoot = normalizeProjectRoot(args.projectRoot);
    const rel = String(args.relativePath || '')
        .replace(/\\/g, '/')
        .trim();
    if (!rel || rel.includes('\0'))
        return { ok: false, error: 'Invalid file path' };
    const full = canonicalizePath(path.resolve(safeRoot, rel));
    if (!isWithinRoot(full, safeRoot))
        return { ok: false, error: 'File is outside workspace root' };
    if (!fs.existsSync(full) || !fs.statSync(full).isFile())
        return { ok: false, error: 'File not found' };
    const max = Math.max(1024, Math.min(Number(args.maxBytes || 120_000), 2_000_000));
    const buf = fs.readFileSync(full);
    const raw = buf.subarray(0, max);
    const content = raw.toString('utf8');
    const looksBinary = content.includes('\u0000');
    if (looksBinary) {
        return {
            ok: true,
            content: '[binary file preview not available]',
            truncated: buf.length > max,
        };
    }
    return {
        ok: true,
        content,
        truncated: buf.length > max,
    };
}
function shellToKind(shell) {
    const s = path.basename(String(shell || '')).toLowerCase();
    if (s.includes('pwsh') || s.includes('powershell'))
        return 'pwsh';
    if (s.includes('fish'))
        return 'fish';
    if (s.includes('zsh'))
        return 'zsh';
    if (s.includes('bash'))
        return 'bash';
    return 'unknown';
}
function finalizePtyBoundaries(webContents, session, flushAll = false) {
    const boundaries = detectCommandBoundaries(session.transcriptBuffer, session.shellKind);
    if (!boundaries.length)
        return;
    const limit = flushAll ? boundaries.length : Math.max(0, boundaries.length - 1);
    if (session.finalizedBoundaryCount >= limit)
        return;
    for (let i = session.finalizedBoundaryCount; i < limit; i += 1) {
        const b = boundaries[i];
        const command = String(b.command || '').trim();
        if (!command)
            continue;
        const streamId = createStableBoundaryStreamId(webContents.id, i);
        ptyStreamOwners.set(streamId, webContents.id);
        const sid = ensureStructuredSession({ source: 'pty_live_capture', projectRoot: session.cwd });
        withStructuredSessionWrite(() => {
            structuredSessionStore?.beginCommand({
                sessionId: sid || undefined,
                streamId,
                command,
                cwd: session.cwd,
                risk: 'read',
                source: 'pty_live_capture',
            });
            structuredSessionStore?.appendChunk(streamId, 'meta', redactChunkIfNeeded(`$ ${command}\n`));
            if (b.output)
                structuredSessionStore?.appendChunk(streamId, 'stdout', redactChunkIfNeeded(b.output));
            structuredSessionStore?.endCommand({
                streamId,
                ok: true,
                code: null,
                cancelled: false,
            });
        });
        addTranscriptEntry({
            type: 'execution_start',
            timestamp: new Date().toISOString(),
            streamId,
            stepId: `pty_${i + 1}`,
            command,
        });
        addTranscriptEntry({
            type: 'execution_end',
            timestamp: new Date().toISOString(),
            streamId,
            ok: true,
        });
    }
    session.finalizedBoundaryCount = limit;
    if (session.transcriptBuffer.length > 500_000) {
        session.transcriptBuffer = session.transcriptBuffer.slice(-300_000);
        session.finalizedBoundaryCount = 0;
    }
    safeSend(webContents, 'rina:pty:boundaryStats', {
        captured: session.finalizedBoundaryCount,
        shell: session.shellKind,
    });
}
function closePtyForWebContents(webContentsId) {
    const timer = ptyResizeTimers.get(webContentsId);
    if (timer) {
        clearTimeout(timer);
        ptyResizeTimers.delete(webContentsId);
    }
    const session = ptySessions.get(webContentsId);
    if (!session)
        return;
    const ptyProcess = session.proc;
    const activeWebContents = webContents.fromId(webContentsId);
    let processStillRunning = true;
    const exitHandler = (event) => {
        processStillRunning = false;
    };
    ptyProcess.onExit(exitHandler);
    try {
        ptyProcess.kill('SIGTERM');
    }
    catch {
        processStillRunning = false;
    }
    setTimeout(() => {
        if (processStillRunning) {
            try {
                ptyProcess.kill('SIGKILL');
            }
            catch {
            }
        }
        ptyProcess.onExit(() => { });
        if (activeWebContents && !activeWebContents.isDestroyed()) {
            activeWebContents.send('rina:pty:terminated', { webContentsId });
        }
    }, 2000);
    for (const [streamId, ownerId] of ptyStreamOwners.entries()) {
        if (ownerId === webContentsId)
            ptyStreamOwners.delete(streamId);
    }
    ptySessions.delete(webContentsId);
}
function createStreamId() {
    return `st_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function createStableBoundaryStreamId(webContentsId, index) {
    return `pty_${webContentsId}_${index}_${Math.random().toString(16).slice(2, 10)}`;
}
async function diagnoseHotLinux() {
    const cpus = os.cpus();
    const loadavg = os.loadavg?.() ?? [];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const topProcesses = await runCommandOnce(TOP_CPU_CMD_SAFE.replace('head -15', 'head -n 15'), 8000).catch((e) => `Unable to read processes: ${String(e)}`);
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
async function runCommandOnceViaEngine(command, timeoutMs) {
    const projectRoot = getDefaultPtyCwd();
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
            ...terminalWriteSafetyFields('read'),
            verification_plan: { steps: [] },
        },
    ];
    const report = await executeViaEngine({
        engine,
        plan,
        projectRoot,
        license: currentLicenseTier,
    });
    const result = report.steps[0]?.result;
    if (!result?.success) {
        const err = result?.error ?? 'Command failed';
        throw new Error(err);
    }
    return result.output ?? '';
}
function runCommandOnce(command, timeoutMs) {
    return runCommandOnceViaEngine(command, timeoutMs);
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
function makePlan(intentRaw, projectRoot) {
    const intent = (intentRaw || '').trim().toLowerCase();
    const id = `plan_${Date.now()}`;
    const buildKind = projectRoot ? detectBuildKind(projectRoot) : 'unknown';
    for (const playbook of PLAYBOOKS) {
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
            { id: 's3', tool: 'terminal', command: TOP_CPU_CMD_SAFE_SHORT, risk: 'read' },
        ],
    };
}
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
function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    setDaemonFunctions({
        daemonStatus,
        daemonTasks,
        daemonTaskAdd,
        daemonStart,
        daemonStop,
        runAgent: async (prompt, opts) => {
            if (opts?.workspaceRoot) {
                try {
                    rinaController.setWorkspaceRoot(resolveProjectRootSafe(String(opts.workspaceRoot)));
                }
                catch {
                }
            }
            if (opts?.mode === 'auto' || opts?.mode === 'assist' || opts?.mode === 'explain') {
                rinaController.setMode(opts.mode);
            }
            return normalizeRinaResponse(await handleRinaMessage(String(prompt || '')));
        },
        getStatus: async () => {
            const stats = rinaController.getStats();
            return {
                ...rinaController.getStatus(),
                tools: rinaController.getTools(),
                agentRunning: rinaController.isAgentRunning(),
                memoryStats: {
                    conversationCount: stats.conversation?.entries ?? 0,
                    learnedCommandsCount: stats.commands?.learned ?? 0,
                    projectsCount: stats.longterm?.sessions ?? 0,
                },
            };
        },
        getMode: async () => rinaController.getMode(),
        setMode: async (mode) => {
            if (mode === 'auto' || mode === 'assist' || mode === 'explain') {
                return rinaController.setMode(mode);
            }
            return { ok: false, error: `Invalid mode: ${String(mode)}` };
        },
        getPlans: async () => rinaController.getPlans(),
        getTools: async () => rinaController.getTools(),
        runsList: runsListForIpc,
        runsTail: runsTailForIpc,
        codeListFiles: codeListFilesForIpc,
        codeReadFile: codeReadFileForIpc,
    });
    setLicenseFunctions({
        verifyLicense,
        applyVerifiedLicense,
        resetLicenseToStarter,
        saveEntitlements,
        refreshLicenseState,
        shell,
        getLicenseState,
        getCurrentLicenseCustomerId,
        getDeviceId: getOrCreateDeviceId,
        getCachedEmail,
        setCachedEmail,
    });
    registerIpcHandlers(win);
    registerSecureAgentIpc(ipcMain, { getLicenseTier: () => currentLicenseTier });
    const webContentsId = win.webContents.id;
    win.loadFile(path.join(__dirname, 'renderer', 'renderer.html'));
    win.once('closed', () => {
        try {
            closePtyForWebContents(webContentsId);
        }
        catch {
        }
    });
    thinkingStream.on('thinking', (step) => {
        safeSend(win.webContents, 'rina:thinking', step);
    });
    if (app.isPackaged) {
        try {
            if (!win.webContents.isDestroyed()) {
                win.webContents.closeDevTools();
            }
        }
        catch {
        }
    }
}
async function devtoolsToggleForIpc(wc) {
    if (wc.isDestroyed())
        return { ok: false, error: 'window destroyed' };
    try {
        if (wc.isDevToolsOpened()) {
            wc.closeDevTools();
            return { ok: true, open: false };
        }
        wc.openDevTools({ mode: 'detach' });
        return { ok: true, open: true };
    }
    catch (err) {
        return { ok: false, error: err && err.message ? err.message : 'failed to toggle devtools' };
    }
}
function createConfirmationScope(step) {
    return `terminal.write:${step.command}`;
}
async function startStreamingStepViaEngine(args) {
    const { webContents, streamId, step, confirmed, confirmationText, projectRoot: rawProjectRoot } = args;
    const projectRoot = normalizeProjectRoot(rawProjectRoot);
    const risk = step.risk;
    const profileGate = gateProfileCommand({
        projectRoot,
        command: step.command,
        risk,
        confirmed,
        confirmationText,
    });
    if (!profileGate.ok) {
        const error = profileGate.message;
        safeSend(webContents, 'rina:stream:end', {
            streamId,
            ok: false,
            code: null,
            error,
        });
        return { ok: false, cancelled: false, error };
    }
    const sessionId = ensureStructuredSession({
        source: 'engine_step_stream',
        projectRoot,
    });
    withStructuredSessionWrite(() => {
        structuredSessionStore?.beginCommand({
            sessionId: sessionId || undefined,
            streamId,
            command: step.command,
            cwd: projectRoot,
            risk,
            source: 'engine_step_stream',
        });
    });
    const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText);
    if (!policyGate.ok) {
        const error = policyGate.message || 'Blocked by policy.';
        safeSend(webContents, 'rina:stream:end', {
            streamId,
            ok: false,
            code: null,
            error,
        });
        withStructuredSessionWrite(() => {
            structuredSessionStore?.endCommand({
                streamId,
                ok: false,
                code: null,
                cancelled: false,
                error,
            });
        });
        return { ok: false, cancelled: false, error };
    }
    let confirmationToken;
    if (risk === 'high-impact') {
        if (!confirmed) {
            const error = 'Confirmation required for high-impact step.';
            safeSend(webContents, 'rina:stream:end', {
                streamId,
                ok: false,
                code: null,
                error,
            });
            return { ok: false, cancelled: false, error };
        }
        const scope = createConfirmationScope(step);
        confirmationToken = { kind: 'explicit', approved: true, scope };
    }
    safeSend(webContents, 'rina:stream:chunk', {
        streamId,
        stream: 'meta',
        data: `$ ${step.command}\n`,
    });
    withStructuredSessionWrite(() => {
        structuredSessionStore?.appendChunk(streamId, 'meta', redactChunkIfNeeded(`$ ${step.command}\n`));
    });
    running.set(streamId, {
        cancelled: false,
        stepId: step.id,
        command: step.command,
    });
    const plan = [
        {
            tool: 'terminal.write',
            input: {
                command: step.command,
                cwd: projectRoot,
                timeoutMs: 60_000,
                stepId: step.id,
            },
            stepId: step.id,
            description: step.description ?? `Execute command: ${step.command}`,
            ...terminalWriteSafetyFields(risk),
            verification_plan: { steps: [] },
        },
    ];
    const report = await executeViaEngine({
        engine,
        plan,
        projectRoot,
        license: currentLicenseTier,
        confirmationToken,
        emit: (evt) => {
            const info = running.get(streamId);
            if (!info)
                return;
            if (info.cancelled)
                return;
            if (evt.type === 'chunk') {
                safeSend(webContents, 'rina:stream:chunk', {
                    streamId,
                    stream: evt.stream,
                    data: forRendererDisplay(evt.data),
                });
                withStructuredSessionWrite(() => {
                    const mapped = evt.stream === 'stderr' ? 'stderr' : 'stdout';
                    structuredSessionStore?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(evt.data || '')));
                });
            }
        },
    });
    const info = running.get(streamId);
    const cancelled = info?.cancelled ?? false;
    running.delete(streamId);
    const lastStep = report.steps.at(-1);
    const lastResult = lastStep?.result;
    const exitCode = lastResult?.meta?.exitCode ?? null;
    const error = cancelled
        ? 'Cancelled by user.'
        : report.ok
            ? null
            : lastResult && !lastResult.success
                ? (lastResult.error ?? 'Execution failed')
                : (report.haltedBecause ?? 'Execution failed');
    safeSend(webContents, 'rina:stream:end', {
        streamId,
        ok: cancelled ? false : report.ok,
        code: exitCode,
        cancelled,
        error,
        report,
    });
    withStructuredSessionWrite(() => {
        structuredSessionStore?.endCommand({
            streamId,
            ok: cancelled ? false : report.ok,
            code: typeof exitCode === 'number' ? exitCode : null,
            cancelled,
            error,
        });
    });
    return {
        ok: cancelled ? false : report.ok,
        cancelled,
        error,
    };
}
async function cancelStream(streamId) {
    const id = String(streamId || '').trim();
    if (!id)
        return { ok: false, message: 'Missing streamId.' };
    const mappedPlanRunId = streamToPlanRun.get(id);
    if (mappedPlanRunId) {
        const st = runningPlanRuns.get(mappedPlanRunId);
        if (st)
            st.stopped = true;
        if (st?.agentdPlanRunId) {
            try {
                await agentdJson('/v1/cancel', {
                    method: 'POST',
                    body: { planRunId: st.agentdPlanRunId, streamId: id, reason: 'soft' },
                    includeLicenseToken: true,
                });
                return { ok: true, message: 'Cancellation requested.' };
            }
            catch (error) {
                return { ok: false, message: error instanceof Error ? error.message : 'Cancellation failed' };
            }
        }
        return { ok: true, message: 'Cancellation queued.' };
    }
    const entry = running.get(id);
    if (!entry)
        return { ok: false, message: 'No running process for that streamId.' };
    entry.cancelled = true;
    return { ok: true, message: 'Cancellation requested.' };
}
async function hardKillStream(streamId) {
    const id = String(streamId || '').trim();
    if (!id)
        return { ok: false, message: 'Missing streamId.' };
    const ownerId = ptyStreamOwners.get(id);
    if (typeof ownerId === 'number') {
        closePtyForWebContents(ownerId);
        return { ok: true, message: 'PTY killed.' };
    }
    const mappedPlanRunId = streamToPlanRun.get(id);
    if (mappedPlanRunId) {
        const st = runningPlanRuns.get(mappedPlanRunId);
        if (st)
            st.stopped = true;
        if (st?.agentdPlanRunId) {
            try {
                await agentdJson('/v1/cancel', {
                    method: 'POST',
                    body: { planRunId: st.agentdPlanRunId, streamId: id, reason: 'hard' },
                    includeLicenseToken: true,
                });
            }
            catch (error) {
                return { ok: false, message: error instanceof Error ? error.message : 'Hard cancel failed' };
            }
        }
        return { ok: true, message: 'Hard cancellation queued.' };
    }
    const entry = running.get(id);
    if (entry) {
        entry.cancelled = true;
        return { ok: true, message: 'Marked cancelled.' };
    }
    return { ok: false, message: 'No running process for that streamId.' };
}
const ENTITLEMENT_FILE = () => path.join(app.getPath('userData'), 'license-entitlement.json');
let currentLicenseStatus = 'unknown';
const LIFETIME_TIERS = new Set(['founder', 'pioneer']);
function validateEntitlementExpiry(data) {
    const { tier, expiresAt } = data;
    if (LIFETIME_TIERS.has(tier)) {
        if (expiresAt === null)
            return { ok: true };
        if (!Number.isFinite(expiresAt)) {
            return { ok: false, reason: 'Lifetime tier has non-finite expiresAt' };
        }
        if (Date.now() > expiresAt * 1000) {
            return { ok: false, reason: 'Lifetime tier has expired' };
        }
        return { ok: true };
    }
    if (expiresAt === null) {
        return { ok: false, reason: 'Subscription tier missing expiresAt' };
    }
    if (!Number.isFinite(expiresAt)) {
        return { ok: false, reason: 'Subscription tier has non-finite expiresAt' };
    }
    if (Date.now() > expiresAt * 1000) {
        return { ok: false, reason: 'Subscription has expired' };
    }
    return { ok: true };
}
function isEntitlementStale(data) {
    if (!data.lastVerifiedAt)
        return true;
    const lastVerified = Date.parse(data.lastVerifiedAt);
    if (!Number.isFinite(lastVerified))
        return true;
    const hoursSinceVerify = (Date.now() - lastVerified) / (1000 * 60 * 60);
    return hoursSinceVerify > 24;
}
function saveEntitlements() {
    try {
        const data = {
            tier: currentLicenseTier,
            token: currentLicenseToken,
            expiresAt: currentLicenseExpiresAt,
            customerId: currentLicenseCustomerId,
            verifiedAt: new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            status: currentLicenseStatus,
        };
        writeJsonFile(ENTITLEMENT_FILE(), data);
        if (app.isPackaged) {
            console.log('[license] Entitlement saved for tier:', currentLicenseTier);
        }
        else {
            console.log('[license] Entitlement saved:', { tier: currentLicenseTier, status: currentLicenseStatus });
        }
    }
    catch (err) {
        console.warn('[license] Failed to save entitlements:', err);
    }
}
function loadEntitlements() {
    try {
        const data = readJsonIfExists(ENTITLEMENT_FILE());
        if (!data)
            return null;
        const validation = validateEntitlementExpiry(data);
        if (!validation.ok) {
            console.log('[license] Stored entitlement invalid:', validation.reason);
            try {
                fs.unlinkSync(ENTITLEMENT_FILE());
            }
            catch {
            }
            return null;
        }
        return data;
    }
    catch (err) {
        console.warn('[license] Failed to load entitlements:', err);
        return null;
    }
}
function applyStoredEntitlement(data) {
    currentLicenseTier = data.tier;
    currentLicenseToken = data.token;
    currentLicenseExpiresAt = data.expiresAt;
    currentLicenseCustomerId = data.customerId;
    currentLicenseStatus = data.status || 'unknown';
}
async function workspacePickDirectoryForIpc() {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Project Root',
        buttonLabel: 'Select Folder',
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
}
async function workspacePickForIpc() {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Workspace Folder',
        buttonLabel: 'Select',
    });
    if (result.canceled || result.filePaths.length === 0) {
        return { ok: false };
    }
    return { ok: true, path: result.filePaths[0] };
}
async function workspaceDefaultForIpc(senderId) {
    const existing = ptySessions.get(senderId);
    const path = existing?.cwd || getDefaultPtyCwd();
    return { ok: true, path };
}
async function codeListFilesForIpc(args) {
    try {
        const projectRoot = resolveProjectRootSafe(args?.projectRoot);
        const files = listProjectFilesSafe(projectRoot, args?.limit);
        return { ok: true, files };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function codeReadFileForIpc(args) {
    try {
        const projectRoot = resolveProjectRootSafe(args?.projectRoot);
        return readProjectFileSafe({
            projectRoot,
            relativePath: String(args?.relativePath || ''),
            maxBytes: args?.maxBytes,
        });
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function runsListForIpc(args) {
    try {
        const sessionsRoot = path.join(app.getPath('userData'), 'structured-session-v1', 'sessions');
        const limit = Math.max(1, Math.min(Number(args?.limit || 24), 100));
        return { ok: true, runs: listStructuredRunsFromSessionsRoot(sessionsRoot, limit) };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
function structuredSessionsRoot() {
    return path.join(app.getPath('userData'), 'structured-session-v1', 'sessions');
}
function structuredRunsRoot() {
    return path.join(app.getPath('userData'), 'structured-session-v1');
}
function findStructuredReceiptArtifact(receiptId) {
    const normalizedId = String(receiptId || '').trim();
    if (!normalizedId)
        return null;
    const sessionsRoot = structuredSessionsRoot();
    if (!fs.existsSync(sessionsRoot))
        return null;
    const directSessionDir = path.join(sessionsRoot, normalizedId);
    const directCommandsFile = path.join(directSessionDir, 'commands.ndjson');
    if (fs.existsSync(directCommandsFile))
        return directCommandsFile;
    const directSessionFile = path.join(directSessionDir, 'session.json');
    if (fs.existsSync(directSessionFile))
        return directSessionFile;
    const sessionEntries = fs.readdirSync(sessionsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const entry of sessionEntries) {
        const commandsFile = path.join(sessionsRoot, entry.name, 'commands.ndjson');
        if (!fs.existsSync(commandsFile))
            continue;
        try {
            const lines = fs.readFileSync(commandsFile, 'utf8').split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const row = JSON.parse(trimmed);
                if (String(row.id || '') === normalizedId)
                    return commandsFile;
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
async function openRunsFolderForIpc() {
    try {
        const rootDir = structuredRunsRoot();
        fs.mkdirSync(rootDir, { recursive: true });
        const error = await shell.openPath(rootDir);
        if (error)
            return { ok: false, error, path: rootDir };
        return { ok: true, path: rootDir };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function revealRunReceiptForIpc(receiptId) {
    try {
        const targetPath = findStructuredReceiptArtifact(receiptId);
        if (!targetPath) {
            return {
                ok: false,
                error: `No structured receipt artifact found for "${String(receiptId || '').trim()}".`,
            };
        }
        shell.showItemInFolder(targetPath);
        return { ok: true, path: targetPath };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function runsTailForIpc(args) {
    try {
        const sessionsRoot = structuredSessionsRoot();
        const tail = readStructuredRunTailFromSessionsRoot(sessionsRoot, {
            sessionId: String(args?.sessionId || ''),
            runId: String(args?.runId || ''),
            maxLines: args?.maxLines,
            maxBytes: args?.maxBytes,
        });
        return {
            ok: true,
            runId: String(args?.runId || ''),
            sessionId: String(args?.sessionId || ''),
            tail,
        };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function pingForIpc() {
    return { pong: true, timestamp: new Date().toISOString() };
}
async function historyImportForIpc(limit) {
    try {
        const data = importShellHistory(Number(limit || 300));
        return { ok: true, ...data };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function diagnoseHotForIpc() {
    if (process.platform === 'linux')
        return await diagnoseHotLinux();
    return { platform: process.platform, message: 'Tuned for Kali/Linux.' };
}
async function planForIpc(intent) {
    addTranscriptEntry({ type: 'intent', timestamp: new Date().toISOString(), intent });
    const plan = makePlan(intent);
    addTranscriptEntry({ type: 'plan', timestamp: new Date().toISOString(), plan });
    return plan;
}
async function playbooksGetForIpc() {
    return PLAYBOOKS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        signals: p.signals,
        fixOptions: p.fixOptions.map((f) => ({
            name: f.name,
            description: f.description,
            risk: f.risk,
        })),
    }));
}
async function playbookExecuteForIpc(playbookId, fixIndex) {
    const playbook = PLAYBOOKS.find((p) => p.id === playbookId);
    if (!playbook)
        throw new Error('Playbook not found');
    const fix = playbook.fixOptions[fixIndex];
    if (!fix)
        throw new Error('Fix option not found');
    addTranscriptEntry({ type: 'playbook', timestamp: new Date().toISOString(), playbookId, playbookName: playbook.name });
    return {
        playbook,
        fix,
        steps: fix.commands.map((cmd, i) => ({
            id: `f${fixIndex}_s${i + 1}`,
            tool: 'terminal',
            command: cmd,
            risk: fix.risk,
            description: fix.verification,
        })),
    };
}
async function redactionPreviewForIpc(text) {
    const out = redactText(String(text || ''));
    return {
        redactedText: out.redactedText,
        hits: out.hits,
        redactionCount: out.hits.length,
    };
}
async function exportPreviewForIpc(args) {
    const kind = String(args?.kind || '');
    let payload = '';
    let redactionCount = 0;
    let hits = [];
    let mime = 'text/plain';
    let fileName = `rina-export-${Date.now()}.txt`;
    if (kind === 'runbook_markdown') {
        const markdown = structuredSessionStore
            ? structuredSessionStore.exportRunbookMarkdown(args?.sessionId)
            : '# RinaWarp Runbook\n\nStructured session store is disabled.\n';
        const redacted = redactText(markdown);
        payload = redacted.redactedText;
        redactionCount = redacted.hits.length;
        hits = redacted.hits;
        mime = 'text/markdown';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fileName = `rina-structured-runbook-${stamp}.md`;
    }
    else if (kind === 'audit_json') {
        payload = buildAuditExportText();
        redactionCount = (payload.match(/\[REDACTED\]/g) || []).length;
        hits = [];
        mime = 'application/json';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fileName = `rina-audit-${stamp}.json`;
    }
    else {
        return { ok: false, error: 'Unsupported export kind' };
    }
    if (!payload.trim())
        return { ok: false, error: 'Empty export payload' };
    const now = Date.now();
    pruneExportPreviewTokens(now);
    const previewId = newExportPreviewId();
    const rec = {
        id: previewId,
        kind,
        createdAtMs: now,
        expiresAtMs: now + EXPORT_PREVIEW_TTL_MS,
        createdBy: getCurrentUserEmail(),
        payload,
        mime,
        fileName,
        redactionCount,
        contentHash: hashText(payload),
    };
    exportPreviewTokens.set(previewId, rec);
    return {
        ok: true,
        previewId,
        kind,
        redactedText: payload,
        redactionCount,
        hits,
        mime,
        fileName,
        contentHash: rec.contentHash,
        expiresAt: new Date(rec.expiresAtMs).toISOString(),
    };
}
async function exportPublishForIpc(args) {
    const previewId = String(args?.previewId || '').trim();
    if (!previewId)
        return { ok: false, error: 'Export publish requires previewId.' };
    if (String(args?.typedConfirm || '') !== 'PUBLISH') {
        return { ok: false, error: 'Export publish requires typed confirmation "PUBLISH".' };
    }
    pruneExportPreviewTokens();
    const rec = exportPreviewTokens.get(previewId);
    if (!rec)
        return { ok: false, error: 'Export preview expired. Generate a new preview before publish.' };
    if (rec.createdBy !== getCurrentUserEmail()) {
        return { ok: false, error: 'Export preview is not valid for the active user.' };
    }
    if (rec.expiresAtMs <= Date.now()) {
        exportPreviewTokens.delete(previewId);
        return { ok: false, error: 'Export preview expired. Generate a new preview before publish.' };
    }
    if (args?.expectedHash && String(args.expectedHash) !== rec.contentHash) {
        return { ok: false, error: 'Export payload changed since preview; regenerate preview.' };
    }
    exportPreviewTokens.delete(previewId);
    return {
        ok: true,
        kind: rec.kind,
        content: rec.payload,
        mime: rec.mime,
        fileName: rec.fileName,
        redactionCount: rec.redactionCount,
    };
}
async function sharePreviewForIpc(args) {
    const actorRole = getCurrentRole();
    if (!hasRoleAtLeast(actorRole, 'operator')) {
        return { ok: false, error: 'Only owner/operator can preview published shares.' };
    }
    const content = String(args?.content || '');
    if (!content.trim())
        return { ok: false, error: 'Empty share content' };
    const redacted = redactText(content);
    const now = Date.now();
    pruneSharePreviewTokens(now);
    const previewId = newSharePreviewId();
    const rec = {
        id: previewId,
        createdAtMs: now,
        expiresAtMs: now + SHARE_PREVIEW_TTL_MS,
        createdBy: getCurrentUserEmail(),
        redactedContent: redacted.redactedText,
        redactionCount: redacted.hits.length,
        contentHash: hashText(redacted.redactedText),
    };
    sharePreviewTokens.set(previewId, rec);
    return {
        ok: true,
        previewId,
        redactedText: rec.redactedContent,
        hits: redacted.hits,
        redactionCount: rec.redactionCount,
        expiresAt: new Date(rec.expiresAtMs).toISOString(),
    };
}
async function shareCreateForIpc(args) {
    const actorRole = getCurrentRole();
    if (!hasRoleAtLeast(actorRole, 'operator')) {
        return { ok: false, error: 'Only owner/operator can publish shares.' };
    }
    const previewId = String(args?.previewId || '').trim();
    if (!previewId)
        return { ok: false, error: 'Publish requires a redaction preview confirmation.' };
    pruneSharePreviewTokens();
    const preview = sharePreviewTokens.get(previewId);
    if (!preview)
        return { ok: false, error: 'Share preview expired. Generate a new preview before publish.' };
    if (preview.createdBy !== getCurrentUserEmail()) {
        return { ok: false, error: 'Share preview is not valid for the active user.' };
    }
    if (preview.expiresAtMs <= Date.now()) {
        sharePreviewTokens.delete(previewId);
        return { ok: false, error: 'Share preview expired. Generate a new preview before publish.' };
    }
    if (args?.content && String(args.content).trim()) {
        const supplied = redactText(String(args.content)).redactedText;
        if (hashText(supplied) !== preview.contentHash) {
            return { ok: false, error: 'Publish payload does not match the approved preview.' };
        }
    }
    const expiresDays = Math.max(1, Math.min(90, Number(args?.expiresDays || 7)));
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();
    const requiredRole = args?.requiredRole && ['owner', 'operator', 'viewer'].includes(args.requiredRole) ? args.requiredRole : 'viewer';
    const db = loadSharesDb();
    const rec = {
        id: `shr_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUserEmail(),
        title: args?.title ? String(args.title).slice(0, 120) : undefined,
        content: preview.redactedContent,
        revoked: false,
        expiresAt,
        requiredRole,
    };
    db.shares.unshift(rec);
    db.shares = db.shares.slice(0, 500);
    saveSharesDb(db);
    sharePreviewTokens.delete(previewId);
    appendTeamActivity('share_created', rec.id, {
        requiredRole: rec.requiredRole,
        expiresAt: rec.expiresAt,
        title: rec.title || null,
    });
    return { ok: true, share: rec };
}
async function shareListForIpc() {
    const db = loadSharesDb();
    const role = getCurrentRole();
    return db.shares
        .filter((s) => hasRoleAtLeast(role, s.requiredRole))
        .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        title: s.title,
        revoked: s.revoked,
        expiresAt: s.expiresAt,
        requiredRole: s.requiredRole,
    }));
}
async function shareGetForIpc(id) {
    const db = loadSharesDb();
    const found = db.shares.find((s) => s.id === id);
    if (!found)
        return { ok: false, error: 'Share not found' };
    if (found.revoked)
        return { ok: false, error: 'Share revoked' };
    if (Date.now() > Date.parse(found.expiresAt))
        return { ok: false, error: 'Share expired' };
    const role = getCurrentRole();
    if (!hasRoleAtLeast(role, found.requiredRole)) {
        appendTeamActivity('share_access_denied', found.id, {
            requiredRole: found.requiredRole,
            actorRole: role,
        });
        return { ok: false, error: 'Insufficient role for share' };
    }
    appendTeamActivity('share_accessed', found.id, {
        requiredRole: found.requiredRole,
    });
    return { ok: true, share: found };
}
async function shareRevokeForIpc(id) {
    const role = getCurrentRole();
    if (!hasRoleAtLeast(role, 'operator')) {
        return { ok: false, error: 'Only owner/operator can revoke shares.' };
    }
    const db = loadSharesDb();
    const idx = db.shares.findIndex((s) => s.id === id);
    if (idx === -1)
        return { ok: false, error: 'Share not found' };
    db.shares[idx] = { ...db.shares[idx], revoked: true };
    saveSharesDb(db);
    appendTeamActivity('share_revoked', id);
    return { ok: true };
}
async function teamGetForIpc() {
    return loadTeamDb();
}
async function teamCreateInviteForIpc(args) {
    if (getCurrentRole() !== 'owner')
        return { ok: false, error: 'Only owner can create invites' };
    const email = String(args?.email || '')
        .trim()
        .toLowerCase();
    if (!email)
        return { ok: false, error: 'Email required' };
    const role = args?.role;
    if (!role || !['owner', 'operator', 'viewer'].includes(role))
        return { ok: false, error: 'Invalid role' };
    const expiresHours = Math.max(1, Math.min(24 * 14, Number(args?.expiresHours || 72)));
    const invites = loadTeamInvitesDb();
    const token = `rwi_${crypto.randomBytes(18).toString('hex')}`;
    const rec = {
        id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        token,
        email,
        role,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUserEmail(),
        expiresAt: new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString(),
        status: 'pending',
    };
    invites.invites.unshift(rec);
    invites.invites = invites.invites.slice(0, 1000);
    saveTeamInvitesDb(invites);
    appendTeamActivity('invite_created', rec.id, { email: rec.email, role: rec.role, expiresAt: rec.expiresAt });
    return {
        ok: true,
        invite: {
            ...rec,
            inviteCode: `${rec.id}.${rec.token}`,
        },
    };
}
async function teamListInvitesForIpc(args) {
    if (!hasRoleAtLeast(getCurrentRole(), 'operator')) {
        return { ok: false, error: 'Only owner/operator can list invites.' };
    }
    const includeSecrets = !!args?.includeSecrets && getCurrentRole() === 'owner';
    const invites = loadTeamInvitesDb().invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        createdBy: inv.createdBy,
        expiresAt: inv.expiresAt,
        status: inv.status,
        acceptedAt: inv.acceptedAt || null,
        acceptedBy: inv.acceptedBy || null,
        ...(includeSecrets ? { inviteCode: `${inv.id}.${inv.token}` } : {}),
    }));
    return { ok: true, invites };
}
async function teamAcceptInviteForIpc(args) {
    const inviteCode = String(args?.inviteCode || '').trim();
    if (!inviteCode.includes('.'))
        return { ok: false, error: 'Invalid invite code format' };
    const [id, token] = inviteCode.split('.', 2);
    const invites = loadTeamInvitesDb();
    const idx = invites.invites.findIndex((inv) => inv.id === id);
    if (idx === -1)
        return { ok: false, error: 'Invite not found' };
    const target = invites.invites[idx];
    if (target.status !== 'pending')
        return { ok: false, error: `Invite is ${target.status}` };
    if (target.token !== token)
        return { ok: false, error: 'Invite code mismatch' };
    if (Date.parse(target.expiresAt) <= Date.now()) {
        invites.invites[idx] = { ...target, status: 'expired' };
        saveTeamInvitesDb(invites);
        return { ok: false, error: 'Invite expired' };
    }
    const currentUser = getCurrentUserEmail();
    if (currentUser !== target.email) {
        return { ok: false, error: `Invite is for ${target.email}; switch current user first.` };
    }
    const team = loadTeamDb();
    const memberIdx = team.members.findIndex((m) => m.email === currentUser);
    if (memberIdx >= 0) {
        team.members[memberIdx] = { email: currentUser, role: target.role };
    }
    else {
        team.members.push({ email: currentUser, role: target.role });
    }
    saveTeamDb(team);
    invites.invites[idx] = {
        ...target,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: currentUser,
    };
    saveTeamInvitesDb(invites);
    appendTeamActivity('invite_accepted', target.id, { email: currentUser, role: target.role });
    return { ok: true, role: target.role };
}
async function teamRevokeInviteForIpc(idRaw) {
    if (getCurrentRole() !== 'owner')
        return { ok: false, error: 'Only owner can revoke invites' };
    const id = String(idRaw || '').trim();
    if (!id)
        return { ok: false, error: 'Invite id required' };
    const invites = loadTeamInvitesDb();
    const idx = invites.invites.findIndex((inv) => inv.id === id);
    if (idx === -1)
        return { ok: false, error: 'Invite not found' };
    if (invites.invites[idx].status === 'accepted')
        return { ok: false, error: 'Accepted invite cannot be revoked' };
    invites.invites[idx] = { ...invites.invites[idx], status: 'revoked' };
    saveTeamInvitesDb(invites);
    appendTeamActivity('invite_revoked', id);
    return { ok: true };
}
async function teamSetCurrentUserForIpc(email) {
    const team = loadTeamDb();
    const normalized = String(email || '')
        .trim()
        .toLowerCase();
    if (!normalized)
        return { ok: false, error: 'Email required' };
    if (!team.members.some((m) => m.email === normalized)) {
        team.members.push({ email: normalized, role: 'viewer' });
    }
    const previousUser = team.currentUser || null;
    team.currentUser = normalized;
    saveTeamDb(team);
    appendTeamActivity('current_user_changed', normalized, { previousUser });
    return { ok: true, role: team.members.find((m) => m.email === normalized)?.role || 'viewer' };
}
async function teamUpsertMemberForIpc(member) {
    if (getCurrentRole() !== 'owner')
        return { ok: false, error: 'Only owner can change team roles' };
    const team = loadTeamDb();
    const email = String(member?.email || '')
        .trim()
        .toLowerCase();
    const role = member?.role;
    if (!email)
        return { ok: false, error: 'Email required' };
    if (!['owner', 'operator', 'viewer'].includes(role))
        return { ok: false, error: 'Invalid role' };
    const idx = team.members.findIndex((m) => m.email === email);
    if (idx >= 0)
        team.members[idx] = { email, role };
    else
        team.members.push({ email, role });
    saveTeamDb(team);
    appendTeamActivity('member_upserted', email, { role });
    return { ok: true };
}
async function teamRemoveMemberForIpc(emailRaw) {
    if (getCurrentRole() !== 'owner')
        return { ok: false, error: 'Only owner can remove team members' };
    const team = loadTeamDb();
    const email = String(emailRaw || '')
        .trim()
        .toLowerCase();
    if (!email)
        return { ok: false, error: 'Email required' };
    const target = team.members.find((m) => m.email === email);
    if (!target)
        return { ok: false, error: 'Member not found' };
    if (target.role === 'owner') {
        const ownerCount = team.members.filter((m) => m.role === 'owner').length;
        if (ownerCount <= 1)
            return { ok: false, error: 'Cannot remove last owner' };
    }
    team.members = team.members.filter((m) => m.email !== email);
    if (team.currentUser === email) {
        team.currentUser = team.members[0]?.email || 'owner@local';
        if (!team.members.some((m) => m.email === team.currentUser)) {
            team.members.unshift({ email: team.currentUser, role: 'owner' });
        }
    }
    saveTeamDb(team);
    appendTeamActivity('member_removed', email);
    return { ok: true };
}
async function teamActivityForIpc(args) {
    if (!hasRoleAtLeast(getCurrentRole(), 'operator')) {
        return { ok: false, error: 'Only owner/operator can access team activity.' };
    }
    const limit = Math.max(1, Math.min(500, Number(args?.limit || 100)));
    return { ok: true, events: loadTeamActivity(limit) };
}
async function auditExportForIpc() {
    if (!hasRoleAtLeast(getCurrentRole(), 'operator')) {
        return { ok: false, error: 'Only owner/operator can export audit logs.' };
    }
    return buildAuditExportText();
}
async function executeStepStreamForIpc(args) {
    const { eventSender, step, confirmed, confirmationText, projectRoot } = args;
    const streamId = createStreamId();
    const normalizedRoot = resolveProjectRootSafe(projectRoot);
    const profileGate = gateProfileCommand({
        projectRoot: normalizedRoot,
        command: step.command,
        risk: step.risk,
        confirmed,
        confirmationText,
    });
    if (!profileGate.ok) {
        safeSend(eventSender, 'rina:stream:end', {
            streamId,
            ok: false,
            code: null,
            cancelled: false,
            error: profileGate.message,
            report: { ok: false, haltedBecause: 'profile_blocked', steps: [] },
        });
        return { streamId };
    }
    const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText);
    if (!policyGate.ok) {
        safeSend(eventSender, 'rina:stream:end', {
            streamId,
            ok: false,
            code: null,
            cancelled: false,
            error: policyGate.message || 'Blocked by policy.',
            report: { ok: false, haltedBecause: 'policy_blocked', steps: [] },
        });
        return { streamId };
    }
    const sessionId = ensureStructuredSession({
        source: 'execute_step_stream',
        projectRoot: normalizedRoot,
    });
    withStructuredSessionWrite(() => {
        structuredSessionStore?.beginCommand({
            sessionId: sessionId || undefined,
            streamId,
            command: step.command,
            cwd: normalizedRoot,
            risk: step.risk,
            source: 'execute_step_stream',
        });
    });
    addTranscriptEntry({
        type: 'approval',
        timestamp: new Date().toISOString(),
        stepId: step.id,
        command: step.command,
        risk: step.risk,
        approved: confirmed,
    });
    addTranscriptEntry({
        type: 'execution_start',
        timestamp: new Date().toISOString(),
        streamId,
        stepId: step.id,
        command: step.command,
    });
    const localPlanRunId = newPlanRunId();
    runningPlanRuns.set(localPlanRunId, { stopped: false });
    streamToPlanRun.set(streamId, localPlanRunId);
    void (async () => {
        try {
            try {
                const execResp = await agentdJson('/v1/execute-plan', {
                    method: 'POST',
                    body: {
                        plan: [toAgentdStep(step, normalizedRoot)],
                        projectRoot: normalizedRoot,
                        confirmed,
                        confirmationText: confirmationText ?? '',
                    },
                    includeLicenseToken: true,
                });
                const state = runningPlanRuns.get(localPlanRunId);
                if (state)
                    state.agentdPlanRunId = execResp.planRunId;
                const response = await fetch(`${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(execResp.planRunId)}`, {
                    method: 'GET',
                    headers: buildAgentdHeaders({ includeLicenseToken: true }),
                });
                if (!response.ok || !response.body) {
                    throw new Error(`agentd stream failed (${response.status})`);
                }
                const decoder = new TextDecoder();
                const reader = response.body.getReader();
                let buffer = '';
                let haltedBecause;
                let stepEndSent = false;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    while (true) {
                        const sep = buffer.indexOf('\n\n');
                        if (sep === -1)
                            break;
                        const rawEvent = buffer.slice(0, sep);
                        buffer = buffer.slice(sep + 2);
                        const lines = rawEvent.split(/\r?\n/);
                        let eventName = 'message';
                        const dataLines = [];
                        for (const line of lines) {
                            if (line.startsWith('event:'))
                                eventName = line.slice(6).trim();
                            if (line.startsWith('data:'))
                                dataLines.push(line.slice(5).trim());
                        }
                        const payloadText = dataLines.join('\n');
                        const payload = payloadText ? JSON.parse(payloadText) : {};
                        if (eventName === 'chunk') {
                            safeSend(eventSender, 'rina:stream:chunk', {
                                streamId,
                                stream: payload.stream,
                                data: forRendererDisplay(payload.data),
                            });
                            withStructuredSessionWrite(() => {
                                const mapped = payload.stream === 'stderr' ? 'stderr' : payload.stream === 'meta' ? 'meta' : 'stdout';
                                structuredSessionStore?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(payload.data || '')));
                            });
                            continue;
                        }
                        if (eventName === 'plan_step_end') {
                            const report = payload.report;
                            const lastResult = report?.steps?.[report.steps.length - 1]?.result;
                            const exitCode = lastResult?.meta?.exitCode ?? null;
                            const error = payload.ok ? null : report?.haltedBecause || lastResult?.error || 'Execution failed';
                            stepEndSent = true;
                            safeSend(eventSender, 'rina:stream:end', {
                                streamId,
                                ok: !!payload.ok,
                                code: exitCode,
                                cancelled: false,
                                error,
                                report,
                            });
                            withStructuredSessionWrite(() => {
                                structuredSessionStore?.endCommand({
                                    streamId,
                                    ok: !!payload.ok,
                                    code: typeof exitCode === 'number' ? exitCode : null,
                                    cancelled: false,
                                    error,
                                });
                            });
                            continue;
                        }
                        if (eventName === 'plan_halt') {
                            haltedBecause = payload?.reason || 'halted';
                            continue;
                        }
                        if (eventName === 'plan_run_end' && haltedBecause && !stepEndSent) {
                            safeSend(eventSender, 'rina:stream:end', {
                                streamId,
                                ok: false,
                                code: null,
                                cancelled: false,
                                error: haltedBecause,
                                report: { ok: false, haltedBecause, steps: [] },
                            });
                            withStructuredSessionWrite(() => {
                                structuredSessionStore?.endCommand({
                                    streamId,
                                    ok: false,
                                    code: null,
                                    cancelled: false,
                                    error: haltedBecause,
                                });
                            });
                        }
                    }
                }
            }
            catch (error) {
                throw new Error(`Execution backend unavailable. No fallback execution was performed. Check connectivity/config and retry. (${error instanceof Error ? error.message : String(error)})`);
            }
        }
        catch (error) {
            safeSend(eventSender, 'rina:stream:end', {
                streamId,
                ok: false,
                code: null,
                cancelled: false,
                error: error instanceof Error ? error.message : 'Execution failed',
                report: { ok: false, haltedBecause: 'execution_failed', steps: [] },
            });
            withStructuredSessionWrite(() => {
                structuredSessionStore?.endCommand({
                    streamId,
                    ok: false,
                    code: null,
                    cancelled: false,
                    error: error instanceof Error ? error.message : 'Execution failed',
                });
            });
        }
        finally {
            streamToPlanRun.delete(streamId);
            runningPlanRuns.delete(localPlanRunId);
        }
    })();
    return { streamId };
}
async function streamCancelForIpc(streamId) {
    return cancelStream(streamId);
}
async function streamKillForIpc(streamId) {
    return hardKillStream(streamId);
}
const runningPlanRuns = new Map();
const streamToPlanRun = new Map();
function newPlanRunId() {
    return `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function terminalWriteSafetyFields(stepRisk) {
    return {
        risk: 'safe-write',
        risk_level: 'medium',
        requires_confirmation: false,
        commandRisk: stepRisk,
    };
}
function toAgentdStep(step, projectRoot) {
    const toolSafety = terminalWriteSafetyFields(step.risk);
    return {
        stepId: step.id,
        tool: 'terminal.write',
        input: {
            command: step.command,
            cwd: projectRoot,
            timeoutMs: 60_000,
            stepId: step.id,
        },
        ...toolSafety,
        verification_plan: { steps: [] },
    };
}
async function pipeAgentdSseToRenderer(args) {
    const { eventSender, localPlanRunId, agentdPlanRunId, runId } = args;
    if (agentdPlanRunId.startsWith('e2e_plan_')) {
        const payload = e2ePlanPayloads.get(agentdPlanRunId);
        e2ePlanPayloads.delete(agentdPlanRunId);
        if (!payload)
            return 'missing_e2e_plan_payload';
        for (const rawStep of payload.plan || []) {
            const command = String(rawStep?.input?.command || '').trim();
            if (!command)
                continue;
            const streamId = createStreamId();
            streamToPlanRun.set(streamId, localPlanRunId);
            safeSend(eventSender, 'rina:plan:stepStart', {
                planRunId: localPlanRunId,
                runId,
                streamId,
                step: {
                    stepId: rawStep?.stepId ?? streamId,
                    tool: 'terminal',
                    input: rawStep?.input ?? {},
                },
            });
            const stepRisk = riskFromPlanStep(rawStep);
            const result = await startStreamingStepViaEngine({
                webContents: eventSender,
                streamId,
                step: {
                    id: String(rawStep?.stepId || streamId),
                    tool: 'terminal',
                    command,
                    risk: stepRisk,
                    description: String(rawStep?.description || command),
                },
                confirmed: payload.confirmed,
                confirmationText: payload.confirmationText,
                projectRoot: payload.projectRoot,
            });
            if (!result.ok) {
                return result.error || 'execution_failed';
            }
        }
        return '';
    }
    const response = await fetch(`${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(agentdPlanRunId)}`, {
        method: 'GET',
        headers: buildAgentdHeaders({ includeLicenseToken: true }),
    });
    if (!response.ok || !response.body) {
        throw new Error(`agentd stream failed (${response.status})`);
    }
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';
    let haltedBecause;
    const readLoop = async () => {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            while (true) {
                const sep = buffer.indexOf('\n\n');
                if (sep === -1)
                    break;
                const rawEvent = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                const lines = rawEvent.split(/\r?\n/);
                let eventName = 'message';
                const dataLines = [];
                for (const line of lines) {
                    if (line.startsWith('event:'))
                        eventName = line.slice(6).trim();
                    if (line.startsWith('data:'))
                        dataLines.push(line.slice(5).trim());
                }
                const payloadText = dataLines.join('\n');
                const payload = payloadText ? JSON.parse(payloadText) : {};
                if (eventName === 'plan_step_start') {
                    const streamId = payload.streamId;
                    if (typeof streamId === 'string') {
                        streamToPlanRun.set(streamId, localPlanRunId);
                        withStructuredSessionWrite(() => {
                            const command = String(payload?.step?.input?.command || '');
                            const cwd = String(payload?.step?.input?.cwd || '');
                            structuredSessionStore?.beginCommand({
                                streamId,
                                command,
                                cwd: cwd || undefined,
                                risk: payload?.step?.risk_level || payload?.step?.risk,
                                source: 'plan_stream_agentd',
                            });
                        });
                    }
                    safeSend(eventSender, 'rina:plan:stepStart', {
                        planRunId: localPlanRunId,
                        runId,
                        streamId: payload.streamId,
                        step: {
                            stepId: payload?.step?.stepId ?? payload?.step?.id ?? payload?.streamId,
                            tool: 'terminal',
                            input: payload?.step?.input ?? {},
                        },
                    });
                    continue;
                }
                if (eventName === 'chunk') {
                    safeSend(eventSender, 'rina:stream:chunk', {
                        streamId: payload.streamId,
                        stream: payload.stream,
                        data: forRendererDisplay(payload.data),
                    });
                    if (typeof payload.streamId === 'string') {
                        withStructuredSessionWrite(() => {
                            const mapped = payload.stream === 'stderr' ? 'stderr' : payload.stream === 'meta' ? 'meta' : 'stdout';
                            structuredSessionStore?.appendChunk(payload.streamId, mapped, redactChunkIfNeeded(String(payload.data || '')));
                        });
                    }
                    continue;
                }
                if (eventName === 'plan_step_end') {
                    const report = payload.report;
                    const lastResult = report?.steps?.[report.steps.length - 1]?.result;
                    const exitCode = lastResult?.meta?.exitCode ?? null;
                    const error = payload.ok ? null : report?.haltedBecause || lastResult?.error || 'Execution failed';
                    if (typeof payload.streamId === 'string') {
                        streamToPlanRun.delete(payload.streamId);
                    }
                    safeSend(eventSender, 'rina:stream:end', {
                        streamId: payload.streamId,
                        ok: !!payload.ok,
                        code: exitCode,
                        cancelled: false,
                        error,
                        report,
                    });
                    if (typeof payload.streamId === 'string') {
                        withStructuredSessionWrite(() => {
                            structuredSessionStore?.endCommand({
                                streamId: payload.streamId,
                                ok: !!payload.ok,
                                code: typeof exitCode === 'number' ? exitCode : null,
                                cancelled: false,
                                error,
                            });
                        });
                    }
                    continue;
                }
                if (eventName === 'plan_halt') {
                    haltedBecause = payload?.reason || 'halted';
                    continue;
                }
                if (eventName === 'plan_run_end') {
                    for (const [streamId, localPlan] of streamToPlanRun.entries()) {
                        if (localPlan === localPlanRunId)
                            streamToPlanRun.delete(streamId);
                    }
                    return haltedBecause;
                }
            }
        }
        return haltedBecause;
    };
    return readLoop();
}
async function planStopForIpc(planRunId) {
    const state = runningPlanRuns.get(planRunId);
    if (!state) {
        return { ok: false, message: 'No running plan for that planRunId.' };
    }
    state.stopped = true;
    if (state.agentdPlanRunId) {
        try {
            await agentdJson('/v1/cancel', {
                method: 'POST',
                body: { planRunId: state.agentdPlanRunId, reason: 'user' },
                includeLicenseToken: true,
            });
        }
        catch {
        }
    }
    if (state.currentStreamId) {
        try {
            await cancelStream(state.currentStreamId);
        }
        catch {
        }
    }
    return { ok: true };
}
import { doctorInspect, doctorCollect, doctorInterpret, doctorVerify, doctorExecuteFix, doctorGetTranscript, doctorExportTranscript, } from './doctor-bridge.js';
import { chatRouter } from './chat-router.js';
async function doctorInspectForIpc(intent) {
    return await doctorInspect(intent);
}
async function doctorCollectForIpc(steps, _streamCallback) {
    for (const step of Array.isArray(steps) ? steps : []) {
        const command = step?.input?.command;
        if (typeof command !== 'string' || !command.trim())
            continue;
        const gate = evaluatePolicyGate(command, false, '');
        if (!gate.ok) {
            throw new Error(gate.message || `Blocked by policy: ${command}`);
        }
    }
    return await doctorCollect(steps, undefined);
}
async function doctorInterpretForIpc(payload) {
    const safePayload = {
        ...payload,
        intent: redactForModel(payload.intent),
        evidence: sanitizeForPersistence(payload.evidence),
    };
    return await doctorInterpret(safePayload);
}
async function doctorVerifyForIpc(payload) {
    const safePayload = {
        ...payload,
        intent: redactForModel(payload.intent),
        before: sanitizeForPersistence(payload.before),
        after: sanitizeForPersistence(payload.after),
        diagnosis: sanitizeForPersistence(payload.diagnosis),
    };
    return await doctorVerify(safePayload);
}
async function doctorExecuteFixForIpc(plan, confirmed, confirmationText) {
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    const explicitCwd = steps.find((step) => typeof step?.input?.cwd === 'string' && step.input.cwd.trim())?.input?.cwd;
    const projectRoot = resolveProjectRootSafe(explicitCwd || getDefaultPtyCwd());
    for (const step of steps) {
        const command = step?.input?.command;
        if (typeof command !== 'string' || !command.trim())
            continue;
        const stepRisk = step?.risk === 'high-impact' ? 'high-impact' : step?.risk === 'read' ? 'read' : 'safe-write';
        const profileGate = gateProfileCommand({
            projectRoot,
            command,
            risk: stepRisk,
            confirmed,
            confirmationText: confirmationText ?? '',
        });
        if (!profileGate.ok) {
            return { ok: false, haltedBecause: profileGate.message, steps: [] };
        }
        const gate = evaluatePolicyGate(command, confirmed, confirmationText ?? '');
        if (!gate.ok) {
            return { ok: false, haltedBecause: gate.message || 'Blocked by policy.', steps: [] };
        }
    }
    return await doctorExecuteFix(plan, confirmed, confirmationText);
}
async function doctorTranscriptGetForIpc() {
    return doctorGetTranscript();
}
async function doctorTranscriptExportForIpc(format) {
    return doctorExportTranscript(format);
}
const conversations = new Map();
function getConversation(win) {
    return conversations.get(win) ?? null;
}
function setConversation(win, state) {
    if (state) {
        conversations.set(win, state);
    }
    else {
        conversations.delete(win);
    }
}
function classifyIntent(text) {
    const s = text.toLowerCase();
    const doctorKeywords = [
        'running hot',
        'overheat',
        'slow',
        'disk',
        'wifi',
        'network',
        'temperature',
        'cpu',
        'memory',
        'fan',
        'thermal',
        'disk full',
        'no space',
        'connection',
        'port',
        'service',
    ];
    for (const kw of doctorKeywords) {
        if (s.includes(kw)) {
            return { type: 'system-doctor', confidence: 0.9, intent: text };
        }
    }
    const devKeywords = ['build', 'compile', 'error', 'failed', 'bug', 'crash', 'debug'];
    for (const kw of devKeywords) {
        if (s.includes(kw)) {
            return { type: 'dev-fixer', confidence: 0.7, intent: text };
        }
    }
    const builderKeywords = ['create', 'scaffold', 'project', 'setup', 'new file'];
    for (const kw of builderKeywords) {
        if (s.includes(kw)) {
            return { type: 'builder', confidence: 0.6, intent: text };
        }
    }
    return { type: 'chat', confidence: 0.5, intent: text };
}
function formatFindingsForChat(findings) {
    if (!findings?.length)
        return 'No significant issues found.';
    const critical = findings.filter((f) => f.severity === 'critical');
    const warnings = findings.filter((f) => f.severity === 'warn');
    const info = findings.filter((f) => f.severity === 'info');
    let parts = [];
    if (critical.length) {
        parts.push(`🚨 **Critical**: ${critical.map((f) => f.title).join(', ')}`);
    }
    if (warnings.length) {
        parts.push(`⚠️ **Warnings**: ${warnings.map((f) => f.title).join(', ')}`);
    }
    if (info.length) {
        parts.push(`ℹ️ **Info**: ${info.map((f) => f.title).join(', ')}`);
    }
    return parts.join('\n');
}
function formatDiagnosisForChat(diagnosis) {
    if (!diagnosis?.primary)
        return 'Unable to determine root cause.';
    const p = diagnosis.primary;
    const conf = Math.round(p.probability * 100);
    let msg = `**Most likely**: ${p.label} (${conf}% confidence)\n`;
    if (diagnosis.notes) {
        msg += `\n${diagnosis.notes}`;
    }
    if (diagnosis.differential?.length) {
        msg += `\n\n**Other possibilities**: ${diagnosis.differential
            .slice(0, 3)
            .map((d) => `${d.label} (${Math.round(d.probability * 100)}%)`)
            .join(', ')}`;
    }
    return msg;
}
function formatFixOptionsForChat(fixOptions) {
    if (!fixOptions?.length)
        return 'No fix options available.';
    return fixOptions
        .map((opt, i) => {
        const riskIcon = opt.risk === 'high-impact' ? '🔴' : opt.risk === 'safe-write' ? '🟡' : '🟢';
        return `${i + 1}. ${riskIcon} **${opt.label}** - ${opt.why || ''}\n   Expected: ${opt.expectedOutcome?.join(', ') || 'issue resolved'}`;
    })
        .join('\n\n');
}
function formatOutcomeForChat(outcome, verification) {
    const status = outcome?.status || (verification?.ok ? 'resolved' : 'unknown');
    const statusEmoji = status === 'resolved' ? '✅' : status === 'improved' ? '📈' : status === 'failed' ? '❌' : '⚠️';
    let msg = `${statusEmoji} **${status.toUpperCase()}**`;
    if (outcome?.rootCause) {
        msg += `\nRoot cause: ${outcome.rootCause}`;
    }
    if (outcome?.confidence) {
        msg += `\nConfidence: ${Math.round(outcome.confidence * 100)}%`;
    }
    if (outcome?.preventionTips?.length) {
        msg += `\n\n**Prevention**: ${outcome.preventionTips.join(', ')}`;
    }
    return msg;
}
async function chatSendForIpc(text, projectRoot) {
    const safeText = redactText(String(text || '')).redactedText;
    const root = resolveProjectRootSafe(projectRoot || getDefaultPtyCwd());
    const profile = defaultProfileForProject(root);
    const rules = loadProjectRules(root, { parentLevels: 2 });
    return await chatRouter.handle(safeText, {
        projectRoot: root,
        rulesBlock: rulesToSystemBlock(rules),
        rulesWarnings: rules.warnings,
        profileSummary: summarizeProfile(profile),
    });
}
async function chatExportForIpc() {
    return doctorExportTranscript('text');
}
function summarizeRinaOutput(output) {
    if (typeof output === 'string')
        return output;
    if (!output || typeof output !== 'object')
        return '';
    const record = output;
    if (typeof record.message === 'string' && record.message.trim())
        return record.message;
    if (typeof record.summary === 'string' && record.summary.trim())
        return record.summary;
    if (Array.isArray(record.commands) && record.commands.length > 0) {
        return `Available commands: ${record.commands.map((value) => String(value)).join(', ')}`;
    }
    if (Array.isArray(record.results) && record.results.length > 0) {
        return record.results
            .map((value) => {
            if (!value || typeof value !== 'object')
                return String(value);
            const item = value;
            const label = typeof item.command === 'string' ? item.command : typeof item.stepId === 'string' ? item.stepId : 'step';
            const status = item.success === true ? 'ok' : item.success === false ? 'failed' : 'done';
            return `${label}: ${status}`;
        })
            .join('\n');
    }
    try {
        return JSON.stringify(output, null, 2);
    }
    catch {
        return String(output);
    }
}
function normalizeRinaResponse(response) {
    const output = response.output;
    const plan = output && typeof output === 'object' && 'plan' in output
        ? output.plan
        : null;
    return {
        ok: response.ok,
        intent: response.intent,
        text: response.error || summarizeRinaOutput(output) || (response.ok ? 'Done.' : 'Something went wrong.'),
        actions: [],
        plan,
        blocked: response.blocked ?? false,
        requiresConfirmation: response.requiresConfirmation ?? false,
        rina: response,
    };
}
async function doctorPlanForIpc(args) {
    const steps = [
        { stepId: 'uptime', tool: 'terminal.write', input: { command: 'uptime', cwd: args.projectRoot } },
        {
            stepId: 'cpu_top',
            tool: 'terminal.write',
            input: { command: 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%cpu | head -n 15', cwd: args.projectRoot },
        },
        {
            stepId: 'mem_top',
            tool: 'terminal.write',
            input: { command: 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%mem | head -n 15', cwd: args.projectRoot },
        },
        { stepId: 'disk_df', tool: 'terminal.write', input: { command: 'df -h', cwd: args.projectRoot } },
        {
            stepId: 'disk_big',
            tool: 'terminal.write',
            input: { command: 'du -h -d 1 . 2>/dev/null | sort -h | tail -n 12', cwd: args.projectRoot },
        },
        {
            stepId: 'sensors',
            tool: 'terminal.write',
            input: { command: 'sensors 2>/dev/null || echo "sensors not available"', cwd: args.projectRoot },
        },
    ];
    return {
        id: `doctor_${Date.now()}`,
        intent: args.symptom,
        reasoning: "I'll collect read-only evidence first (CPU, memory, disk, sensors). No changes yet.",
        steps,
        playbookId: 'doctor.running_hot.v1',
    };
}
app.whenReady().then(async () => {
    try {
        const daemonResult = await daemonStart();
        console.log('[daemon] Auto-start result:', daemonResult);
    }
    catch (err) {
        console.warn('[daemon] Auto-start failed:', err);
    }
    initAnalytics();
    if (featureFlags.structuredSessionV1) {
        const rootDir = path.join(app.getPath('userData'), 'structured-session-v1');
        structuredSessionStore = new StructuredSessionStore(rootDir, true);
        ctx.structuredSessionStore = structuredSessionStore;
        withStructuredSessionWrite(() => structuredSessionStore?.init());
    }
    const storedEntitlement = loadEntitlements();
    if (storedEntitlement) {
        applyStoredEntitlement(storedEntitlement);
        console.log(`[license] Restored ${storedEntitlement.tier} tier from persisted entitlement`);
        if (isEntitlementStale(storedEntitlement) && storedEntitlement.customerId) {
            console.log('[license] Entitlement stale (>24h), attempting soft refresh...');
            verifyLicense(storedEntitlement.customerId)
                .then((data) => {
                if (data?.ok) {
                    applyVerifiedLicense(data);
                    saveEntitlements();
                    console.log(`[license] Soft refresh successful: ${currentLicenseTier}`);
                }
            })
                .catch((err) => {
                console.warn('[license] Soft refresh failed (offline?):', err instanceof Error ? err.message : String(err));
            });
        }
    }
    createWindow();
    registerPtyHandlers({ resolvePtyCwd });
    registerAgentExecutionIpc({
        ipcMain,
        newPlanRunId,
        resolveProjectRootSafe,
        ensureStructuredSession,
        runningPlanRuns,
        safeSend,
        riskFromPlanStep,
        gateProfileCommand,
        evaluatePolicyGate,
        executeRemotePlan: executeRemotePlanForIpc,
        pipeAgentdSseToRenderer,
        createStreamId,
        executeStepStream: executeStepStreamForIpc,
        streamCancel: streamCancelForIpc,
        streamKill: streamKillForIpc,
        planStop: planStopForIpc,
    });
    ipcMain.handle('rina:analytics:funnel', async (_event, step, properties) => {
        try {
            trackFunnelStep(step, properties);
            return { ok: true };
        }
        catch (error) {
            console.error('[Analytics] Failed to track funnel step:', error);
            return { ok: false, error: String(error) };
        }
    });
    ipcMain.removeHandler('rina:agent:plan');
    ipcMain.handle('rina:agent:plan', async (_event, args) => {
        try {
            const projectRoot = resolveProjectRootSafe(args?.projectRoot);
            return await fetchRemotePlanForIpc({
                intentText: String(args?.intentText || ''),
                projectRoot,
            });
        }
        catch (error) {
            return {
                id: `plan_error_${Date.now()}`,
                reasoning: error instanceof Error ? error.message : String(error),
                steps: [],
            };
        }
    });
    ipcMain.removeHandler('rina:openRunsFolder');
    ipcMain.handle('rina:openRunsFolder', async () => openRunsFolderForIpc());
    ipcMain.removeHandler('rina:revealRunReceipt');
    ipcMain.handle('rina:revealRunReceipt', async (_event, receiptId) => revealRunReceiptForIpc(receiptId));
    ipcMain.removeHandler('rina:workspace:default');
    ipcMain.handle('rina:workspace:default', async (event) => workspaceDefaultForIpc(event.sender.id));
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('before-quit', () => {
    for (const id of ptySessions.keys()) {
        closePtyForWebContents(id);
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
//# sourceMappingURL=main.js.map
