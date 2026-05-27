import fs from 'node:fs/promises'
import path from 'node:path'

export type FileSnapshot = {
  path: string
  before: string | null
  backupPath?: string
}

type TransactionSnapshots = {
  files: Map<string, FileSnapshot>
  createdDirectories: Set<string>
  removedDirectories: Set<string>
}

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code
}

export class ExecutionSandbox {
  private readonly root: string
  private activeTransactionId: string | null = null
  private readonly snapshots = new Map<string, TransactionSnapshots>()

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  public beginTransaction(transactionId: string): void {
    if (!transactionId.trim()) throw new Error('Transaction ID is required for filesystem mutation.')
    this.activeTransactionId = transactionId
    if (!this.snapshots.has(transactionId)) {
      this.snapshots.set(transactionId, {
        files: new Map(),
        createdDirectories: new Set(),
        removedDirectories: new Set(),
      })
    }
  }

  public commitTransaction(transactionId: string): void {
    this.requireTransaction(transactionId)
    this.activeTransactionId = null
  }

  public getSnapshots(transactionId: string): FileSnapshot[] {
    return Array.from(this.snapshots.get(transactionId)?.files.values() || [])
  }

  public async readFile(filePath: string): Promise<string> {
    return fs.readFile(await this.resolve(filePath), 'utf8')
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = await this.resolve(filePath)
    await this.captureFileSnapshot(filePath, resolved)
    await fs.writeFile(resolved, content, 'utf8')
  }

  public async deleteFile(filePath: string): Promise<void> {
    const resolved = await this.resolve(filePath)
    await this.captureFileSnapshot(filePath, resolved)
    await fs.rm(resolved, { force: true })
  }

  public async renameFile(oldPath: string, newPath: string): Promise<void> {
    const oldResolved = await this.resolve(oldPath)
    const newResolved = await this.resolve(newPath)
    await this.captureFileSnapshot(oldPath, oldResolved)
    await this.captureFileSnapshot(newPath, newResolved)
    await fs.rename(oldResolved, newResolved)
  }

  public async mkdir(directoryPath: string): Promise<void> {
    const transaction = this.currentTransaction()
    const resolved = await this.resolve(directoryPath)
    try {
      await fs.stat(resolved)
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error
      transaction.createdDirectories.add(directoryPath)
    }
    await fs.mkdir(resolved, { recursive: true })
  }

  public async rmdir(directoryPath: string): Promise<void> {
    const transaction = this.currentTransaction()
    const resolved = await this.resolve(directoryPath)
    const entries = await fs.readdir(resolved)
    if (entries.length > 0) {
      throw new Error('Execution sandbox refuses to remove a non-empty directory without a restorable snapshot.')
    }
    transaction.removedDirectories.add(directoryPath)
    await fs.rmdir(resolved)
  }

  public async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.requireTransaction(transactionId)
    const fileSnapshots = Array.from(transaction.files.values()).reverse()
    for (const snapshot of fileSnapshots) {
      const resolved = await this.resolve(snapshot.path)
      if (snapshot.before === null) {
        await fs.rm(resolved, { force: true })
      } else {
        await fs.writeFile(resolved, snapshot.before, 'utf8')
      }
    }

    const directories = Array.from(transaction.createdDirectories).reverse()
    for (const directoryPath of directories) {
      const resolved = await this.resolve(directoryPath)
      await fs.rm(resolved, { recursive: true, force: true })
    }
    for (const directoryPath of transaction.removedDirectories) {
      await fs.mkdir(await this.resolve(directoryPath), { recursive: true })
    }
    this.activeTransactionId = null
  }

  private currentTransaction(): TransactionSnapshots {
    if (!this.activeTransactionId) {
      throw new Error('Filesystem mutation requires an active transaction.')
    }
    return this.requireTransaction(this.activeTransactionId)
  }

  private requireTransaction(transactionId: string): TransactionSnapshots {
    const transaction = this.snapshots.get(transactionId)
    if (!transaction) throw new Error(`Transaction ${transactionId} has no filesystem snapshot context.`)
    return transaction
  }

  private async captureFileSnapshot(filePath: string, resolved: string): Promise<FileSnapshot> {
    const transaction = this.currentTransaction()
    const existing = transaction.files.get(filePath)
    if (existing) return existing

    let before: string | null = null
    try {
      before = await fs.readFile(resolved, 'utf8')
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error
    }

    const snapshot: FileSnapshot = { path: filePath, before }
    if (before !== null) {
      const transactionId = this.activeTransactionId as string
      const safeTransaction = transactionId.replace(/[^A-Za-z0-9._-]+/g, '_')
      const safePath = filePath.replace(/[^A-Za-z0-9._-]+/g, '__')
      const backupRelativePath = path.join('.rinawarp', 'patch-backups', safeTransaction, safePath)
      const backupPath = await this.resolve(backupRelativePath)
      const backupDirectory = path.dirname(backupPath)
      await fs.mkdir(backupDirectory, { recursive: true })
      await fs.writeFile(backupPath, before, 'utf8')
      snapshot.backupPath = path.relative(this.root, backupPath)
    }

    transaction.files.set(filePath, snapshot)
    return snapshot
  }

  private async resolve(candidate: string): Promise<string> {
    const relativePath = String(candidate || '').trim()
    if (!relativePath || relativePath.includes('\0') || path.isAbsolute(relativePath)) {
      throw new Error('Execution sandbox requires a workspace-relative path.')
    }
    if (relativePath.split(/[\\/]+/g).includes('..')) {
      throw new Error('Execution sandbox rejects path traversal outside its workspace root.')
    }

    const resolved = path.resolve(this.root, relativePath)
    const relative = path.relative(this.root, resolved)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Execution sandbox rejects paths outside its workspace root.')
    }

    const realRoot = await fs.realpath(this.root)
    let existingAncestor = resolved
    while (true) {
      try {
        const realAncestor = await fs.realpath(existingAncestor)
        const realRelative = path.relative(realRoot, realAncestor)
        if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
          throw new Error('Execution sandbox rejects paths that escape its workspace through a symlink.')
        }
        return resolved
      } catch (error) {
        if (errorCode(error) !== 'ENOENT') throw error
        const parent = path.dirname(existingAncestor)
        if (parent === existingAncestor) throw error
        existingAncestor = parent
      }
    }
  }
}
