export interface D1Meta {
  changes?: number
  duration?: number
  last_row_id?: number
  rows_read?: number
  rows_written?: number
  size_after?: number
}

export interface D1RunResult {
  success: boolean
  meta: D1Meta
}

export interface D1QueryResult<T = Record<string, unknown>> {
  success: boolean
  meta: D1Meta
  results?: T[]
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>
  run(): Promise<D1RunResult>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}
