import type { ExecutionReceipt } from './types.js'
import { getReceiptId } from './receiptCompat.js'

const STORAGE_KEY = 'rinawarp.execution-receipts.v1'
const MAX_RECEIPTS = 40

type ReceiptStore = Record<string, ExecutionReceipt>

function readStore(): ReceiptStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ReceiptStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: ReceiptStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // persistence is best-effort for trust UX
  }
}

export function persistExecutionReceipt(receipt: ExecutionReceipt): void {
  const store = readStore()
  store[getReceiptId(receipt)] = receipt
  const keys = Object.keys(store)
  if (keys.length > MAX_RECEIPTS) {
    for (const key of keys.slice(0, keys.length - MAX_RECEIPTS)) {
      delete store[key]
    }
  }
  writeStore(store)
}

export function loadExecutionReceipt(id: string): ExecutionReceipt | null {
  const store = readStore()
  return store[id] || null
}

export function listPersistedReceiptRunIds(): string[] {
  return Object.keys(readStore())
}
