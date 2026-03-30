import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import * as vscode from 'vscode';

import type { DiagnosticRunSummary } from './diagnostics';

export interface CompanionWorkspaceContext {
  dependencyNames?: string[];
  devDependencyNames?: string[];
  fileSummaries?: Array<{ name: string; path: string; summary: string }>;
  gitStatusSummary?: string;
  hasWorkspace: boolean;
  workspaceName?: string;
  topLevelEntries?: string[];
  packageName?: string;
  packageScripts?: string[];
  packageManagerHint?: string;
  markers: string[];
  summary: string;
}

export async function gatherWorkspaceContext(): Promise<CompanionWorkspaceContext> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return {
      hasWorkspace: false,
      markers: [],
      summary: 'No workspace folder is open in VS Code right now.',
    };
  }

  const root = folder.uri.fsPath;
  const names = await safeReadDir(root);
  const topLevelEntries = names.slice(0, 12);
  const packageJson = await readPackageJson(path.join(root, 'package.json'));
  const markers = detectMarkers(topLevelEntries, packageJson);

  const packageScripts = packageJson?.scripts ? Object.keys(packageJson.scripts).slice(0, 8) : [];
  const dependencyNames = packageJson?.dependencies ? Object.keys(packageJson.dependencies).slice(0, 12) : [];
  const devDependencyNames = packageJson?.devDependencies ? Object.keys(packageJson.devDependencies).slice(0, 12) : [];
  const packageManagerHint = names.includes('pnpm-lock.yaml')
    ? 'pnpm'
    : names.includes('package-lock.json')
      ? 'npm'
      : names.includes('yarn.lock')
        ? 'yarn'
        : undefined;

  const gitStatusSummary = await readGitStatus(root);
  const fileSummaries = await readTopLevelFileSummaries(root, names);

  const summaryParts = [
    `Workspace: ${folder.name}.`,
    packageJson?.name ? `Package: ${packageJson.name}.` : null,
    packageManagerHint ? `Package manager hint: ${packageManagerHint}.` : null,
    markers.length ? `Signals: ${markers.join(', ')}.` : 'No strong project markers were detected yet.',
    packageScripts.length ? `Scripts: ${packageScripts.join(', ')}.` : null,
    gitStatusSummary ? `Git: ${gitStatusSummary}.` : null,
  ].filter(Boolean);

  return {
    dependencyNames,
    devDependencyNames,
    fileSummaries,
    gitStatusSummary,
    hasWorkspace: true,
    workspaceName: folder.name,
    topLevelEntries,
    packageName: typeof packageJson?.name === 'string' ? packageJson.name : undefined,
    packageScripts,
    packageManagerHint,
    markers,
    summary: summaryParts.join(' '),
  };
}

export function canAnswerLocally(prompt: string): boolean {
  return /\b(workspace|project|repo|summarize|summary|scripts|package\.json|readme|dockerfile|wrangler|tsconfig|files|folder|what am i in|what do you see|what did you find|git|branch|status|dependencies|deps|packages|stack|tech|technology|show|explain|recommend|recommended|pack|why|first step|next step|plan|risk|risks|blocker|blockers|watch out|inspect|where should i start|which file)\b/i.test(prompt);
}

export async function answerWorkspaceQuestion(
  prompt: string,
  context: CompanionWorkspaceContext,
  diagnostic?: DiagnosticRunSummary,
): Promise<string> {
  if (!context.hasWorkspace) {
    return 'No workspace folder is open right now, so I can only answer general Companion questions until you open a project.';
  }

  const normalized = prompt.toLowerCase();
  if (/\b(compare|options|tradeoff|tradeoffs|choices)\b.*\b(pack|workflow)\b/.test(normalized)) {
    const ranked = rankPackCandidates(context, diagnostic);
    return buildPackComparison(context, ranked);
  }

  if (/\b(summarize|summary|what is this project|what kind of project|what is this repo|what am i looking at|stack|tech)\b/.test(normalized)) {
    return buildWorkspaceSummaryCard(context, diagnostic);
  }

  if (/\b(why|recommend|recommended).*\b(pack|workflow)\b|\bwhich pack\b/.test(normalized)) {
    const recommendation = inferRecommendedPack(context, diagnostic);
    return `${context.summary} I would recommend ${recommendation.pack} because ${recommendation.reason} ${summarizeRunnerUps(rankPackCandidates(context, diagnostic))}`;
  }

  if (/\b(risk|risks|blocker|blockers|watch out|what could break|concern|concerns)\b/.test(normalized)) {
    return buildRiskCard(context, diagnostic);
  }

  if (/\b(first step|next step|plan|what should i do first|what should i do next)\b/.test(normalized)) {
    const ranked = rankPackCandidates(context, diagnostic);
    const recommendation = ranked[0];
    return buildLocalPlan(context, recommendation.pack, recommendation.reason, ranked.slice(1, 3));
  }

  if (/\b(where should i start|which file|what file should i inspect|inspect first|start with file)\b/.test(normalized)) {
    const recommendation = inferRecommendedPack(context, diagnostic);
    const file = findRelevantConfigFile(context, recommendation);
    if (!file) {
      return `${context.summary} I do not see one strong starter file, so the safest beginning is to run the free diagnostic and then open ${recommendation.pack}.`;
    }
    return [
      'Decision card',
      `Best first file: ${file.name}`,
      `Why: ${file.summary}`,
      `Recommended next action: Inspect ${file.name}, then run the free diagnostic, then open ${recommendation.pack}.`,
    ].join('\n\n');
  }

  const fileMatch = findRequestedFile(normalized, context.fileSummaries || []);
  if (fileMatch) {
    return `${context.summary} ${fileMatch.summary}`;
  }

  if (/\bgit|branch|status|dirty|clean\b/.test(normalized)) {
    if (!context.gitStatusSummary) {
      return `${context.summary} I could not detect a git status summary for this workspace.`;
    }
    return `${context.summary} Current git status: ${context.gitStatusSummary}.`;
  }

  if (/\bdependencies|deps|packages\b/.test(normalized)) {
    const deps = context.dependencyNames?.length ? context.dependencyNames.join(', ') : 'no regular dependencies detected';
    const devDeps = context.devDependencyNames?.length ? context.devDependencyNames.join(', ') : 'no dev dependencies detected';
    return `${context.summary} Dependencies: ${deps}. Dev dependencies: ${devDeps}.`;
  }

  if (/\bscripts|package\.json|npm|pnpm|yarn\b/.test(normalized)) {
    if (!context.packageScripts?.length) {
      return `${context.summary} I do not see any package scripts yet.`;
    }
    return `${context.summary} The main scripts I can see are: ${context.packageScripts.join(', ')}.`;
  }

  if (/\bfiles|folder|repo|workspace|project|what do you see|what am i in\b/.test(normalized)) {
    const entries = context.topLevelEntries?.length ? context.topLevelEntries.join(', ') : 'no obvious entries';
    return `${context.summary} Top-level entries include: ${entries}.`;
  }

  return context.summary;
}

export function inferRecommendedPack(
  context: CompanionWorkspaceContext,
  diagnostic?: DiagnosticRunSummary,
): { pack: string; reason: string } {
  return rankPackCandidates(context, diagnostic)[0];
}

export function rankPackCandidates(
  context: CompanionWorkspaceContext,
  diagnostic?: DiagnosticRunSummary,
): Array<{ pack: string; reason: string }> {
  const picks: Array<{ pack: string; reason: string }> = [];

  if (diagnostic?.recommendedPack) {
    picks.push({
      pack: diagnostic.recommendedPack,
      reason: diagnostic.recommendedReason || 'that was the strongest signal from the last diagnostic.',
    });
  }

  if (context.markers.includes('docker')) {
    picks.push({
      pack: 'docker-repair',
      reason: 'the workspace has Docker signals, so container diagnostics are the strongest next workflow.',
    });
  }

  if (context.packageManagerHint || context.markers.includes('node-project')) {
    picks.push({
      pack: 'npm-audit',
      reason: 'the workspace looks like a JavaScript/TypeScript project with a package manager, so dependency and package health checks are the safest next step.',
    });
  }

  if (context.markers.includes('env-file') || context.markers.includes('github')) {
    picks.push({
      pack: 'security-audit',
      reason: 'the project exposes environment or CI signals, which makes a security-oriented review the highest-value next move.',
    });
  }

  if (context.markers.includes('tests')) {
    picks.push({
      pack: 'test-runner',
      reason: 'the workspace appears to include tests, so validating the current test path is a direct next action.',
    });
  }

  picks.push({
    pack: 'system-diagnostics',
    reason: 'there is no stronger specialist signal yet, so a broad diagnostics pass is the best default.',
  });

  const deduped: Array<{ pack: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const pick of picks) {
    if (seen.has(pick.pack)) continue;
    seen.add(pick.pack);
    deduped.push(pick);
  }
  return deduped;
}

function buildPackComparison(
  context: CompanionWorkspaceContext,
  ranked: Array<{ pack: string; reason: string }>,
): string {
  const top = ranked.slice(0, 3);
  const best = top[0];
  const alternatives = top.slice(1).map((entry) => `- ${entry.pack}: ${entry.reason}`).join('\n');
  return [
    'Decision card',
    `Best recommendation: ${best.pack}`,
    `Why: ${best.reason}`,
    `Recommended next action: Open ${best.pack} to inspect the pack details, or say "run the diagnostic" first if you want a fresh proof-style summary.`,
    alternatives ? `Alternatives:\n${alternatives}` : null,
    `Workspace evidence: ${context.summary}`,
  ].filter(Boolean).join('\n\n');
}

function buildWorkspaceSummaryCard(
  context: CompanionWorkspaceContext,
  diagnostic?: DiagnosticRunSummary,
): string {
  const stack = summarizeTechStack(context);
  const recommendation = inferRecommendedPack(context, diagnostic);
  const entries = context.topLevelEntries?.slice(0, 6).join(', ') || 'no obvious top-level entries';
  return [
    'Decision card',
    `Workspace summary: ${context.workspaceName || 'Current workspace'}`,
    `What I see: ${stack}`,
    `Top-level entries: ${entries}`,
    `Best recommendation: ${recommendation.pack}`,
    `Why: ${recommendation.reason}`,
    `Recommended next action: Run the free diagnostic, then inspect the suggested pack or a relevant config file.`,
  ].join('\n\n');
}

function summarizeRunnerUps(
  ranked: Array<{ pack: string; reason: string }>,
): string {
  const alternatives = ranked.slice(1, 3);
  if (!alternatives.length) {
    return '';
  }
  return `Runner-up options: ${alternatives.map((entry) => `${entry.pack} (${entry.reason})`).join('; ')}.`;
}

function buildLocalPlan(
  context: CompanionWorkspaceContext,
  pack: string,
  reason: string,
  alternatives: Array<{ pack: string; reason: string }>,
): string {
  const configFile = findRelevantConfigFile(context, { pack, reason });
  const steps = [
    `1. Confirm the workspace shape first. ${context.summary}`,
    configFile
      ? `2. Inspect ${configFile.name} first so you can ground the next step in a real project file.`
      : '2. Identify the main project file or config before making changes.',
    `3. Run the free diagnostic so Companion can attach a fresh proof-style summary to the current project state.`,
    `4. Open ${pack} next because ${reason}`,
  ];

  if (alternatives.length) {
    steps.push(`5. Keep these as runner-up options if the first path is not the right fit: ${alternatives.map((entry) => `${entry.pack}`).join(', ')}.`);
  }

  if (context.packageScripts?.length) {
    steps.push(`6. Use the visible scripts (${context.packageScripts.slice(0, 4).join(', ')}) as the first commands to inspect before making any risky changes.`);
  }

  return [
    'Decision card',
    `Best recommendation: ${pack}`,
    `Why: ${reason}`,
    `Recommended next action: ${context.hasWorkspace ? 'Run Free Diagnostic first, then open ' + pack + '.' : 'Open ' + pack + ' to inspect the recommended workflow.'}`,
    'Next safe actions:',
    steps.join('\n'),
  ].join('\n\n');
}

function buildRiskCard(
  context: CompanionWorkspaceContext,
  diagnostic?: DiagnosticRunSummary,
): string {
  const risks: string[] = [];

  if (context.gitStatusSummary && !/working tree clean/i.test(context.gitStatusSummary)) {
    risks.push(`The workspace is already dirty: ${context.gitStatusSummary}.`);
  }
  if (!context.packageManagerHint && context.markers.includes('node-project')) {
    risks.push('There is a Node-style project signal, but no package manager lockfile was detected yet.');
  }
  if (context.markers.includes('env-file')) {
    risks.push('Environment files are present, so config and secret handling need extra care.');
  }
  if (context.markers.includes('docker')) {
    risks.push('Docker assets are present, so runtime issues may involve both app code and container config.');
  }
  if (context.markers.includes('github')) {
    risks.push('CI/workflow files are present, so changes may affect deployment or automation behavior.');
  }
  if (!context.markers.includes('tests')) {
    risks.push('No clear test signal was detected, so verification may depend on manual checks.');
  }
  if (diagnostic?.recommendedPack) {
    risks.push(`The last diagnostic pointed toward ${diagnostic.recommendedPack}, which is a signal worth following before making broader changes.`);
  }

  const recommendation = inferRecommendedPack(context, diagnostic);
  const findings = risks.length ? risks.map((risk) => `- ${risk}`).join('\n') : '- No obvious high-risk marker stands out yet.';
  return [
    'Decision card',
    `Best recommendation: ${recommendation.pack}`,
    `Why: ${recommendation.reason}`,
    'Risks to watch:',
    findings,
    'Recommended next action: Inspect the most relevant config file, then run the free diagnostic before taking a riskier workflow step.',
  ].join('\n\n');
}

function summarizeTechStack(context: CompanionWorkspaceContext): string {
  const parts: string[] = [];
  if (context.packageName) {
    parts.push(`package ${context.packageName}`);
  }
  if (context.packageManagerHint) {
    parts.push(`${context.packageManagerHint}-managed app`);
  }
  if (context.markers.includes('docker')) {
    parts.push('containerized workflow');
  }
  if (context.markers.includes('react')) {
    parts.push('React');
  }
  if (context.markers.includes('typescript')) {
    parts.push('TypeScript');
  }
  if (context.markers.includes('github')) {
    parts.push('GitHub automation');
  }
  if (context.markers.includes('tests')) {
    parts.push('test coverage present');
  }
  return parts.length ? parts.join(', ') : 'a general project workspace with limited strong signals so far';
}

export function findRelevantConfigFile(
  context: CompanionWorkspaceContext,
  recommendation?: { pack: string; reason: string },
): { name: string; path: string; summary: string } | undefined {
  const files = context.fileSummaries || [];
  if (recommendation?.pack === 'docker-repair') {
    return files.find((file) => file.name === 'Dockerfile');
  }
  if (recommendation?.pack === 'npm-audit' || recommendation?.pack === 'test-runner') {
    return files.find((file) => file.name === 'package.json') || files.find((file) => file.name === 'tsconfig.json');
  }
  if (recommendation?.pack === 'security-audit') {
    return files.find((file) => file.name === 'wrangler.toml') || files.find((file) => file.name === 'README.md');
  }
  return files.find((file) => file.name === 'package.json')
    || files.find((file) => file.name === 'wrangler.toml')
    || files.find((file) => file.name === 'README.md');
}

export function findRequestedFile(
  normalizedPrompt: string,
  files: Array<{ name: string; path: string; summary: string }>,
): { name: string; path: string; summary: string } | undefined {
  const aliases: Array<{ pattern: RegExp; names: string[] }> = [
    { pattern: /\bpackage\.json|package json\b/, names: ['package.json'] },
    { pattern: /\breadme\b/, names: ['README.md'] },
    { pattern: /\bdockerfile|docker\b/, names: ['Dockerfile'] },
    { pattern: /\bwrangler\b/, names: ['wrangler.toml'] },
    { pattern: /\btsconfig\b/, names: ['tsconfig.json'] },
  ];

  for (const alias of aliases) {
    if (!alias.pattern.test(normalizedPrompt)) continue;
    const match = files.find((file) => alias.names.includes(file.name));
    if (match) return match;
  }
  return undefined;
}

function detectMarkers(entries: string[], packageJson?: PackageJson): string[] {
  const markers: string[] = [];
  const has = (value: string) => entries.includes(value);

  if (has('package.json')) markers.push('node-project');
  if (has('Dockerfile') || has('docker-compose.yml') || has('compose.yaml')) markers.push('docker');
  if (has('.github')) markers.push('github');
  if (has('.env')) markers.push('env-file');
  if (has('tests') || has('__tests__')) markers.push('tests');
  if (packageJson?.dependencies?.react || packageJson?.devDependencies?.react) markers.push('react');
  if (packageJson?.dependencies?.typescript || packageJson?.devDependencies?.typescript) markers.push('typescript');
  return markers;
}

async function safeReadDir(target: string): Promise<string[]> {
  try {
    return (await readdir(target)).sort();
  } catch {
    return [];
  }
}

async function readPackageJson(target: string): Promise<PackageJson | undefined> {
  try {
    const raw = await readFile(target, 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return undefined;
  }
}

async function readGitStatus(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await promisify(execFile)('git', ['-C', root, 'status', '--short', '--branch']);
    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return undefined;
    }

    const head = lines[0]?.replace(/^##\s*/, '') || 'unknown branch';
    const changedCount = Math.max(0, lines.length - 1);
    return changedCount > 0 ? `${head}; ${changedCount} changed path(s)` : `${head}; working tree clean`;
  } catch {
    return undefined;
  }
}

async function readTopLevelFileSummaries(
  root: string,
  entries: string[],
): Promise<Array<{ name: string; path: string; summary: string }>> {
  const candidates = entries.filter((entry) =>
    ['package.json', 'README.md', 'Dockerfile', 'wrangler.toml', 'tsconfig.json'].includes(entry),
  );

  const summaries: Array<{ name: string; path: string; summary: string }> = [];
  for (const name of candidates) {
    const filePath = path.join(root, name);
    const summary = await summarizeFile(filePath, name);
    if (summary) {
      summaries.push({ name, path: filePath, summary });
    }
  }
  return summaries;
}

async function summarizeFile(target: string, name: string): Promise<string | undefined> {
  try {
    const raw = await readFile(target, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
      return `${name} is present but currently empty.`;
    }

    if (name === 'package.json') {
      const parsed = JSON.parse(raw) as PackageJson;
      const scripts = parsed.scripts ? Object.keys(parsed.scripts).slice(0, 6).join(', ') : 'no scripts';
      const deps = parsed.dependencies ? Object.keys(parsed.dependencies).slice(0, 6).join(', ') : 'no dependencies';
      const appType = detectPackageAppType(parsed);
      return `package.json summary: name=${parsed.name || 'unknown'}, appType=${appType}, scripts=${scripts}, dependencies=${deps}.`;
    }

    if (name === 'tsconfig.json') {
      const parsed = JSON.parse(raw) as TsConfigJson;
      const compilerOptions = parsed.compilerOptions || {};
      const moduleValue = compilerOptions.module || 'not set';
      const targetValue = compilerOptions.target || 'not set';
      const jsxValue = compilerOptions.jsx || 'not set';
      const strictValue = compilerOptions.strict === true ? 'enabled' : compilerOptions.strict === false ? 'disabled' : 'not set';
      return `tsconfig summary: module=${moduleValue}, target=${targetValue}, jsx=${jsxValue}, strict=${strictValue}.`;
    }

    if (name === 'wrangler.toml') {
      const summary = summarizeWranglerToml(trimmed);
      return summary || `${name} is present and looks like a Cloudflare deployment config.`;
    }

    if (name === 'Dockerfile') {
      const summary = summarizeDockerfile(trimmed);
      return summary || `${name} is present and defines a container build for this project.`;
    }

    if (name === 'README.md') {
      const summary = summarizeReadme(trimmed);
      return summary || `${name} is present and likely documents project purpose and setup.`;
    }

    const lines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
    return `${name} preview: ${lines.join(' | ')}`;
  } catch {
    return undefined;
  }
}

function detectPackageAppType(parsed: PackageJson): string {
  const deps = { ...parsed.dependencies, ...parsed.devDependencies };
  if (deps.next) return 'nextjs';
  if (deps.react) return 'react';
  if (deps.vue) return 'vue';
  if (deps.svelte) return 'svelte';
  if (deps.express) return 'express';
  if (deps.vitest || deps.jest) return 'typescript-or-node project with tests';
  return 'generic node project';
}

function summarizeWranglerToml(raw: string): string | undefined {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const name = extractTomlValue(lines, 'name');
  const compatibilityDate = extractTomlValue(lines, 'compatibility_date');
  const main = extractTomlValue(lines, 'main');
  const pagesDir = extractTomlValue(lines, 'pages_build_output_dir');
  const hasD1 = /\[\[d1_databases\]\]/i.test(raw);
  const hasR2 = /\[\[r2_buckets\]\]/i.test(raw);
  const mode = pagesDir ? 'pages' : main ? 'worker' : 'cloudflare config';
  return `wrangler summary: mode=${mode}, name=${name || 'not set'}, compatibility_date=${compatibilityDate || 'not set'}, entry=${main || pagesDir || 'not set'}, bindings=${[
    hasD1 ? 'd1' : null,
    hasR2 ? 'r2' : null,
  ].filter(Boolean).join(', ') || 'none detected'}.`;
}

function summarizeDockerfile(raw: string): string | undefined {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const fromLine = lines.find((line) => /^FROM\s+/i.test(line));
  const exposeLine = lines.find((line) => /^EXPOSE\s+/i.test(line));
  const cmdLine = lines.find((line) => /^(CMD|ENTRYPOINT)\s+/i.test(line));
  return `Dockerfile summary: base=${fromLine ? fromLine.replace(/^FROM\s+/i, '') : 'not found'}, port=${exposeLine ? exposeLine.replace(/^EXPOSE\s+/i, '') : 'not exposed'}, run=${cmdLine || 'no CMD/ENTRYPOINT found'}.`;
}

function summarizeReadme(raw: string): string | undefined {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, '');
  const firstParagraph = lines.find((line) => !/^#/.test(line) && line.length > 20);
  return `README summary: title=${heading || 'not found'}, first description=${firstParagraph ? truncate(firstParagraph, 140) : 'not found'}.`;
}

function extractTomlValue(lines: string[], key: string): string | undefined {
  const line = lines.find((entry) => entry.startsWith(`${key} =`));
  if (!line) return undefined;
  return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface TsConfigJson {
  compilerOptions?: {
    jsx?: string;
    module?: string;
    strict?: boolean;
    target?: string;
  };
}
