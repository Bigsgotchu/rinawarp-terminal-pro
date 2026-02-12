/**
 * Git Tool Executor
 *
 * Safe Git operations for version control integration.
 */
import { TerminalResult } from "./terminal.js";
export interface GitStatus {
    branch: string;
    ahead: number;
    behind: number;
    modified: string[];
    staged: string[];
    untracked: string[];
}
export interface GitLogEntry {
    hash: string;
    author: string;
    date: string;
    message: string;
}
/**
 * Get the current git status.
 *
 * @param repoPath - Path to the git repository
 * @returns Promise resolving to git status
 */
export declare function getStatus(repoPath: string): Promise<GitStatus>;
/**
 * Get recent git log entries.
 *
 * @param repoPath - Path to the git repository
 * @param count - Number of entries to retrieve
 * @returns Promise resolving to array of log entries
 */
export declare function getLog(repoPath: string, count?: number): Promise<GitLogEntry[]>;
/**
 * Stage files for commit.
 *
 * @param repoPath - Path to the git repository
 * @param files - Files to stage (empty = stage all)
 * @returns Promise resolving to command result
 */
export declare function stage(repoPath: string, files?: string[]): Promise<TerminalResult>;
/**
 * Create a commit.
 *
 * @param repoPath - Path to the git repository
 * @param message - Commit message
 * @returns Promise resolving to command result
 */
export declare function commit(repoPath: string, message: string): Promise<TerminalResult>;
/**
 * Get the current branch name.
 *
 * @param repoPath - Path to the git repository
 * @returns Promise resolving to branch name
 */
export declare function getBranch(repoPath: string): Promise<string>;
/**
 * Check if a directory is a git repository.
 *
 * @param path - Path to check
 * @returns Promise resolving to true if git repo
 */
export declare function isRepo(path: string): Promise<boolean>;
