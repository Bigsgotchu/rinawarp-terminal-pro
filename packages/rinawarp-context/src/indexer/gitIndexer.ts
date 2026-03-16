/**
 * Git Indexer
 * 
 * Indexes Git repository information for semantic search.
 * Includes commits, branches, tags, and recent changes.
 */

import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { embedText } from '../embedding/embedder.js'
import { addVector, VectorDoc } from '../vector/vectorStore.js'

/**
 * Git indexer configuration
 */
export interface GitIndexerConfig {
  /** Maximum number of commits to index */
  maxCommits: number
  /** Include branch information */
  includeBranches: boolean
  /** Include tags */
  includeTags: boolean
  /** Include diff for recent changes */
  includeRecentChanges: boolean
  /** Number of recent commits to show diffs for */
  recentCommitsWithDiff: number
  /** Show progress logging */
  verbose: boolean
}

/**
 * Default git indexer configuration
 */
export const defaultGitIndexerConfig: GitIndexerConfig = {
  maxCommits: 100,
  includeBranches: true,
  includeTags: true,
  includeRecentChanges: true,
  recentCommitsWithDiff: 10,
  verbose: false
}

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  message: string
  diff?: string
}

/**
 * Git branch information
 */
export interface GitBranch {
  name: string
  isRemote: boolean
  isCurrent: boolean
  lastCommit?: string
}

/**
 * Git tag information
 */
export interface GitTag {
  name: string
  commit: string
  message?: string
  date?: string
}

/**
 * Check if a directory is a git repository
 */
export function isGitRepo(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, '.git'))
  } catch {
    return false
  }
}

/**
 * Run a git command in the given directory
 */
function gitCommand(dir: string, args: string[]): string {
  try {
    return execSync(args.join(' '), {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
  } catch {
    return ''
  }
}

/**
 * Get git repository root
 */
export function getGitRoot(dir: string): string | null {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    return root || null
  } catch {
    return null
  }
}

/**
 * Index a git repository
 * 
 * @param root - Root directory of the project (must be a git repo)
 * @param config - Optional configuration
 * @returns Promise resolving to indexed item count
 */
export async function indexGit(
  root: string,
  config: Partial<GitIndexerConfig> = {}
): Promise<number> {
  const cfg = { ...defaultGitIndexerConfig, ...config }
  
  if (cfg.verbose) {
    console.log(`[GitIndexer] Starting indexing of git repository: ${root}`)
  }
  
  // Validate git repo
  if (!isGitRepo(root)) {
    if (cfg.verbose) {
      console.log(`[GitIndexer] Not a git repository, skipping`)
    }
    return 0
  }
  
  let indexedCount = 0
  
  // Index branches
  if (cfg.includeBranches) {
    const branches = getBranches(root)
    for (const branch of branches) {
      await indexBranch(branch, root)
      indexedCount++
    }
  }
  
  // Index tags
  if (cfg.includeTags) {
    const tags = getTags(root)
    for (const tag of tags) {
      await indexTag(tag, root)
      indexedCount++
    }
  }
  
  // Index commits
  const commits = getCommits(root, cfg.maxCommits)
  for (const commit of commits) {
    // Get diff for recent commits
    if (cfg.includeRecentChanges && commits.indexOf(commit) < cfg.recentCommitsWithDiff) {
      commit.diff = getCommitDiff(root, commit.hash)
    }
    
    await indexCommit(commit, root)
    indexedCount++
  }
  
  // Index current status
  await indexStatus(root)
  indexedCount++
  
  if (cfg.verbose) {
    console.log(`[GitIndexer] Completed. Indexed ${indexedCount} items`)
  }
  
  return indexedCount
}

/**
 * Get list of branches
 */
export function getBranches(root: string): GitBranch[] {
  const output = gitCommand(root, ['git', 'branch', '-a'])
  if (!output) return []
  
  const currentBranch = gitCommand(root, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  
  return output.split('\n')
    .map(line => {
      const name = line.replace(/^\*?\s*/, '').trim()
      if (!name) return null
      
      const isRemote = name.startsWith('remotes/')
      const isCurrent = name === currentBranch
      
      return {
        name: name.replace(/^remotes\//, ''),
        isRemote,
        isCurrent
      }
    })
    .filter((b): b is GitBranch => b !== null)
}

/**
 * Get list of tags
 */
export function getTags(root: string): GitTag[] {
  const output = gitCommand(root, ['git', 'tag', '-l', '--format=%(refname:short)|%(objectname)|%(contents)'])
  if (!output) return []
  
  return output.split('\n')
    .map(line => {
      const parts = line.split('|')
      if (parts.length < 2 || !parts[0] || !parts[1]) return null
      
      return {
        name: parts[0],
        commit: parts[1],
        message: parts[2] || undefined
      } as GitTag
    })
    .filter((t): t is GitTag => t !== null)
}

/**
 * Get recent commits
 */
export function getCommits(root: string, maxCount: number = 100): GitCommit[] {
  const format = '%H|%h|%an|%ae|%aI|%s'
  const output = gitCommand(root, ['git', 'log', `--max-count=${maxCount}`, `--format=${format}`])
  if (!output) return []
  
  return output.split('\n')
    .map(line => {
      const parts = line.split('|')
      if (parts.length < 6) return null
      
      return {
        hash: parts[0],
        shortHash: parts[1],
        author: parts[2],
        email: parts[3],
        date: parts[4],
        message: parts[5]
      }
    })
    .filter((c): c is GitCommit => c !== null)
}

/**
 * Get diff for a commit
 */
export function getCommitDiff(root: string, hash: string): string {
  return gitCommand(root, ['git', 'show', hash, '--stat', '--patch'])
}

/**
 * Get current git status
 */
export function getStatus(root: string): {
  branch: string
  status: string
  staged: string[]
  modified: string[]
  untracked: string[]
} {
  const branch = gitCommand(root, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  const status = gitCommand(root, ['git', 'status', '--porcelain'])
  
  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []
  
  for (const line of status.split('\n')) {
    if (!line) continue
    
    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const file = line.slice(3)
    
    if (indexStatus === '?') {
      untracked.push(file)
    } else if (indexStatus !== ' ' || workTreeStatus !== ' ') {
      modified.push(file)
    }
    
    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push(file)
    }
  }
  
  return { branch, status, staged, modified, untracked }
}

/**
 * Index a branch
 */
async function indexBranch(branch: GitBranch, repoRoot: string): Promise<VectorDoc> {
  const text = `Branch: ${branch.name}${branch.isCurrent ? ' (current)' : ''}${branch.isRemote ? ' (remote)' : ''}`
  const embedding = await embedText(text)
  
  return addVector({
    id: `git:branch:${branch.name}`,
    text,
    embedding,
    metadata: {
      type: 'git',
      subType: 'branch',
      name: branch.name,
      isRemote: branch.isRemote,
      isCurrent: branch.isCurrent,
      repo: repoRoot
    }
  })
}

/**
 * Index a tag
 */
async function indexTag(tag: GitTag, repoRoot: string): Promise<VectorDoc> {
  const text = `Tag: ${tag.name}\nCommit: ${tag.commit}${tag.message ? `\nMessage: ${tag.message}` : ''}`
  const embedding = await embedText(text)
  
  return addVector({
    id: `git:tag:${tag.name}`,
    text,
    embedding,
    metadata: {
      type: 'git',
      subType: 'tag',
      name: tag.name,
      commit: tag.commit,
      message: tag.message,
      repo: repoRoot
    }
  })
}

/**
 * Index a commit
 */
async function indexCommit(commit: GitCommit, repoRoot: string): Promise<VectorDoc> {
  let text = `Commit: ${commit.shortHash} (${commit.hash})\n`
  text += `Author: ${commit.author} <${commit.email}>\n`
  text += `Date: ${commit.date}\n`
  text += `Message: ${commit.message}\n`
  
  if (commit.diff) {
    text += `\nChanges:\n${commit.diff.slice(0, 2000)}`
  }
  
  const embedding = await embedText(text)
  
  return addVector({
    id: `git:commit:${commit.hash}`,
    text,
    embedding,
    metadata: {
      type: 'git',
      subType: 'commit',
      hash: commit.hash,
      shortHash: commit.shortHash,
      author: commit.author,
      email: commit.email,
      date: commit.date,
      message: commit.message,
      repo: repoRoot
    }
  })
}

/**
 * Index current git status
 */
async function indexStatus(repoRoot: string): Promise<VectorDoc> {
  const status = getStatus(repoRoot)
  
  let text = `Current Branch: ${status.branch}\n`
  text += `Modified Files: ${status.modified.length}\n`
  text += `Untracked Files: ${status.untracked.length}\n`
  text += `Staged Files: ${status.staged.length}\n`
  
  if (status.modified.length > 0) {
    text += `\nModified:\n${status.modified.join('\n')}\n`
  }
  
  if (status.untracked.length > 0) {
    text += `\nUntracked:\n${status.untracked.join('\n')}\n`
  }
  
  const embedding = await embedText(text)
  
  return addVector({
    id: `git:status:${repoRoot}`,
    text,
    embedding,
    metadata: {
      type: 'git',
      subType: 'status',
      branch: status.branch,
      modified: status.modified,
      untracked: status.untracked,
      staged: status.staged,
      repo: repoRoot
    }
  })
}

/**
 * Get summary of git repository
 */
export function getGitSummary(root: string): {
  isRepo: boolean
  branch?: string
  commitsBehind?: number
  aheadBehind?: { ahead: number; behind: number }
} {
  if (!isGitRepo(root)) {
    return { isRepo: false }
  }
  
  const branch = gitCommand(root, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  
  // Try to get ahead/behind for current branch
  const aheadBehind = gitCommand(root, ['git', 'rev-list', '--left-right', '--count', `${branch}...HEAD`])
  
  return {
    isRepo: true,
    branch
  }
}
