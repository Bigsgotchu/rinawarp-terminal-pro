/**
 * Git Tool Executor
 *
 * Safe Git operations for version control integration.
 */
import { run } from "./terminal.js";
/**
 * Get the current git status.
 *
 * @param repoPath - Path to the git repository
 * @returns Promise resolving to git status
 */
export async function getStatus(repoPath) {
    const result = await run("git status", { cwd: repoPath });
    const status = {
        branch: "unknown",
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
    };
    // Parse branch
    const branchMatch = result.stdout.match(/On branch\s+(\S+)/);
    if (branchMatch) {
        status.branch = branchMatch[1];
    }
    // Parse ahead/behind
    const aheadMatch = result.stdout.match(/Your branch is ahead of\s+'[^']+'\s+by\s+(\d+)\s+commit/);
    const behindMatch = result.stdout.match(/and\s+behind\s+by\s+(\d+)\s+commit/);
    if (aheadMatch)
        status.ahead = parseInt(aheadMatch[1], 10);
    if (behindMatch)
        status.behind = parseInt(behindMatch[1], 10);
    // Parse modified/staged/untracked files
    const stagedMatch = result.stdout.match(/Changes to be committed:\s*([\s\S]*?)(?=\n\n|$)/);
    const unstagedMatch = result.stdout.match(/Changes not staged:\s*([\s\S]*?)(?=\n\n|$)/);
    const untrackedMatch = result.stdout.match(/Untracked files:\s*([\s\S]*?)(?=\n\n|$)/);
    if (stagedMatch) {
        status.staged = parseGitFileList(stagedMatch[1]);
    }
    if (unstagedMatch) {
        status.modified = parseGitFileList(unstagedMatch[1]);
    }
    if (untrackedMatch) {
        status.untracked = parseGitFileList(untrackedMatch[1]);
    }
    return status;
}
/**
 * Get recent git log entries.
 *
 * @param repoPath - Path to the git repository
 * @param count - Number of entries to retrieve
 * @returns Promise resolving to array of log entries
 */
export async function getLog(repoPath, count = 10) {
    const format = "--pretty=format:%h|%an|%ad|%s";
    const dateFormat = "--date=short";
    const result = await run(`git log ${format} ${dateFormat} -n ${count}`, { cwd: repoPath });
    const entries = [];
    for (const line of result.stdout.trim().split("\n")) {
        if (!line.trim())
            continue;
        const parts = line.split("|");
        if (parts.length >= 4) {
            entries.push({
                hash: parts[0],
                author: parts[1],
                date: parts[2],
                message: parts.slice(3).join("|"),
            });
        }
    }
    return entries;
}
/**
 * Stage files for commit.
 *
 * @param repoPath - Path to the git repository
 * @param files - Files to stage (empty = stage all)
 * @returns Promise resolving to command result
 */
export async function stage(repoPath, files = []) {
    const args = files.length > 0 ? files.map((f) => `"${f}"`).join(" ") : ".";
    return run(`git add ${args}`, { cwd: repoPath });
}
/**
 * Create a commit.
 *
 * @param repoPath - Path to the git repository
 * @param message - Commit message
 * @returns Promise resolving to command result
 */
export async function commit(repoPath, message) {
    return run(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: repoPath,
    });
}
/**
 * Get the current branch name.
 *
 * @param repoPath - Path to the git repository
 * @returns Promise resolving to branch name
 */
export async function getBranch(repoPath) {
    const result = await run("git rev-parse --abbrev-ref HEAD", {
        cwd: repoPath,
    });
    return result.stdout.trim();
}
/**
 * Check if a directory is a git repository.
 *
 * @param path - Path to check
 * @returns Promise resolving to true if git repo
 */
export async function isRepo(path) {
    try {
        const result = await run("git rev-parse --git-dir", { cwd: path });
        return result.exitCode === 0;
    }
    catch {
        return false;
    }
}
// Helper to parse git file list output
function parseGitFileList(content) {
    return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
        // Remove file status indicators
        return line
            .replace(/^(new file:|modified:|deleted:)\s*/i, "")
            .replace(/^\s+/, "");
    });
}
