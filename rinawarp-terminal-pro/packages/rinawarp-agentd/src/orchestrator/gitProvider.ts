import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd: repoPath,
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  return { stdout: String(stdout || ""), stderr: String(stderr || "") };
}

export async function ensureGitRepo(repoPath: string): Promise<void> {
  await git(repoPath, ["rev-parse", "--is-inside-work-tree"]);
}

export async function currentBranch(repoPath: string): Promise<string> {
  const { stdout } = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function createOrSwitchBranch(repoPath: string, branchName: string): Promise<void> {
  await git(repoPath, ["checkout", "-B", branchName]);
}

export async function stageAll(repoPath: string): Promise<void> {
  await git(repoPath, ["add", "-A"]);
}

export async function hasStagedChanges(repoPath: string): Promise<boolean> {
  try {
    await git(repoPath, ["diff", "--cached", "--quiet"]);
    return false;
  } catch (error: any) {
    if (typeof error?.code === "number" && error.code === 1) return true;
    throw error;
  }
}

export async function commit(repoPath: string, message: string): Promise<void> {
  await git(repoPath, ["commit", "-m", message]);
}

export async function push(repoPath: string, branchName: string): Promise<void> {
  await git(repoPath, ["push", "-u", "origin", branchName]);
}
