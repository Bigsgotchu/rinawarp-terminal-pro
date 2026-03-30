import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import * as vscode from 'vscode';

export interface DiagnosticRunSummary {
  checkedAt: string;
  findings: string[];
  proofSummary: string;
  recommendedPack: string;
  recommendedReason: string;
  workspaceName: string;
}

export async function runWorkspaceDiagnostic(output: vscode.OutputChannel): Promise<DiagnosticRunSummary> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error('Open a workspace folder before running the free diagnostic.');
  }

  const root = folder.uri.fsPath;
  const findings: string[] = [];

  const packageJson = await readJsonIfPresent(path.join(root, 'package.json'));
  const hasPackageLock = await exists(path.join(root, 'package-lock.json'));
  const hasPnpmLock = await exists(path.join(root, 'pnpm-lock.yaml'));
  const hasDockerfile = await exists(path.join(root, 'Dockerfile'));
  const hasDockerCompose = await exists(path.join(root, 'docker-compose.yml')) || await exists(path.join(root, 'compose.yaml'));
  const hasGithubWorkflows = await exists(path.join(root, '.github', 'workflows'));
  const hasEnvFile = await exists(path.join(root, '.env'));
  const hasTestsDir = await exists(path.join(root, 'tests')) || await exists(path.join(root, '__tests__'));
  const hasVitest = hasDependency(packageJson, 'vitest');
  const hasJest = hasDependency(packageJson, 'jest');
  const hasScripts = packageJson?.scripts ?? {};

  findings.push(`Workspace: ${folder.name}`);
  findings.push(`Node project: ${packageJson ? 'yes' : 'no'}`);
  if (packageJson) {
    findings.push(`Package manager hints: ${describePackageManager(hasPackageLock, hasPnpmLock)}`);
  }
  findings.push(`Docker assets: ${hasDockerfile || hasDockerCompose ? 'present' : 'not detected'}`);
  findings.push(`CI workflows: ${hasGithubWorkflows ? 'present' : 'not detected'}`);
  findings.push(`Environment file: ${hasEnvFile ? 'present' : 'not detected'}`);
  findings.push(`Tests: ${hasTestsDir || hasVitest || hasJest ? 'present' : 'not detected'}`);

  const recommended = recommendPack({
    hasDockerCompose,
    hasDockerfile,
    hasEnvFile,
    hasGithubWorkflows,
    hasJest,
    hasPackageLock,
    hasPnpmLock,
    hasTestsDir,
    hasVitest,
    packageJson,
  });

  const proofSummary = [
    'Proof-backed diagnostic summary',
    `Checked workspace markers at ${new Date().toLocaleString()}.`,
    `Recommended next pack: ${recommended.pack}.`,
    recommended.reason,
  ].join(' ');

  output.clear();
  output.appendLine('RinaWarp Companion');
  output.appendLine('');
  output.appendLine(proofSummary);
  output.appendLine('');
  output.appendLine('Findings');
  for (const finding of findings) {
    output.appendLine(`- ${finding}`);
  }
  output.appendLine('');
  output.appendLine('Suggested next step');
  output.appendLine(`- Open pack: ${recommended.pack}`);
  output.appendLine(`- Why: ${recommended.reason}`);
  output.show(true);

  return {
    checkedAt: new Date().toISOString(),
    findings,
    proofSummary,
    recommendedPack: recommended.pack,
    recommendedReason: recommended.reason,
    workspaceName: folder.name,
  };
}

function hasDependency(packageJson: PackageJson | undefined, name: string): boolean {
  if (!packageJson) return false;
  return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]);
}

function describePackageManager(hasPackageLock: boolean, hasPnpmLock: boolean): string {
  if (hasPnpmLock) return 'pnpm lockfile detected';
  if (hasPackageLock) return 'npm lockfile detected';
  return 'no lockfile detected';
}

function recommendPack(input: {
  hasDockerCompose: boolean;
  hasDockerfile: boolean;
  hasEnvFile: boolean;
  hasGithubWorkflows: boolean;
  hasJest: boolean;
  hasPackageLock: boolean;
  hasPnpmLock: boolean;
  hasTestsDir: boolean;
  hasVitest: boolean;
  packageJson?: PackageJson;
}): { pack: string; reason: string } {
  if (input.hasDockerfile || input.hasDockerCompose) {
    return {
      pack: 'docker-repair',
      reason: 'Docker assets are present, so container diagnostics and repair are the most likely next value.',
    };
  }

  if (input.hasPackageLock || input.hasPnpmLock) {
    return {
      pack: 'npm-audit',
      reason: 'A JavaScript package manager is present, so dependency and vulnerability checks are a natural first workflow.',
    };
  }

  if (input.hasEnvFile || input.hasGithubWorkflows) {
    return {
      pack: 'security-audit',
      reason: 'Environment or CI files are present, so a security-oriented review is a strong next trust-building step.',
    };
  }

  if (input.hasTestsDir || input.hasVitest || input.hasJest || input.packageJson?.scripts?.test) {
    return {
      pack: 'test-runner',
      reason: 'The workspace appears to have tests, so a guided proof-backed test run is the most direct next action.',
    };
  }

  return {
    pack: 'system-diagnostics',
    reason: 'No stronger pack signal was found, so start with a broad diagnostics pass.',
  };
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfPresent(target: string): Promise<PackageJson | undefined> {
  try {
    const raw = await readFile(target, 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return undefined;
  }
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}
