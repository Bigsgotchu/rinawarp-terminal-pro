declare module 'better-sqlite3' {
  export interface RunResult {
    changes: number
    lastInsertRowid: number | bigint
  }

  export interface Statement {
    run(...params: unknown[]): RunResult
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
  }

  export interface Transaction<T extends (...args: never[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>
  }

  export interface Database {
    exec(sql: string): this
    prepare(sql: string): Statement
    transaction<T extends (...args: never[]) => unknown>(fn: T): Transaction<T>
    close(): void
  }

  export default class BetterSqlite3Database implements Database {
    constructor(filename: string, options?: Record<string, unknown>)
    exec(sql: string): this
    prepare(sql: string): Statement
    transaction<T extends (...args: never[]) => unknown>(fn: T): Transaction<T>
    close(): void
  }
}
