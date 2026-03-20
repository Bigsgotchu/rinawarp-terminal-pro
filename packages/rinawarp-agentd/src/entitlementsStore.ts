import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type EntitlementTier = 'starter' | 'pro' | 'team' | 'enterprise'
export type EntitlementStatus = 'active' | 'expired' | 'suspended' | 'cancelled' | 'inactive'

export type EntitlementRecord = {
  customerId: string
  tier: EntitlementTier
  status: EntitlementStatus
  expiresAt: number | null
  stripeCustomerId?: string
  subscriptionId?: string
  email?: string
  deviceId?: string
  updatedAt: string
}

type StoreRecord = {
  customerId: string
  tier: EntitlementTier
  status: EntitlementStatus
  expiresAt: number | null
  stripeCustomerId?: string
  subscriptionId?: string
  updatedAt: string
}

type EntitlementsStore = {
  version: 1
  customers: Record<string, StoreRecord>
  devices: Record<string, StoreRecord>
  emails: Record<string, StoreRecord>
  stripeCustomers: Record<string, string>
  subscriptions: Record<string, string>
  updatedAt: string
}

function defaultStore(): EntitlementsStore {
  return {
    version: 1,
    customers: {},
    devices: {},
    emails: {},
    stripeCustomers: {},
    subscriptions: {},
    updatedAt: new Date().toISOString(),
  }
}

function entitlementsFile(): string {
  const explicit = String(process.env.RINAWARP_ENTITLEMENTS_FILE || '').trim()
  if (explicit) return explicit
  return path.join(os.homedir(), '.rinawarp', 'entitlements.json')
}

function normalizeEmail(email?: string | null): string {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function ensureDir(): void {
  fs.mkdirSync(path.dirname(entitlementsFile()), { recursive: true })
}

function readStore(): EntitlementsStore {
  const file = entitlementsFile()
  if (!fs.existsSync(file)) return defaultStore()
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<EntitlementsStore>
    return {
      version: 1,
      customers: parsed.customers || {},
      devices: parsed.devices || {},
      emails: parsed.emails || {},
      stripeCustomers: parsed.stripeCustomers || {},
      subscriptions: parsed.subscriptions || {},
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    }
  } catch {
    return defaultStore()
  }
}

function writeStore(store: EntitlementsStore): void {
  ensureDir()
  store.updatedAt = new Date().toISOString()
  fs.writeFileSync(entitlementsFile(), `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

function toRecord(input: {
  customerId: string
  tier: EntitlementTier
  status: EntitlementStatus
  expiresAt: number | null
  stripeCustomerId?: string
  subscriptionId?: string
}): StoreRecord {
  return {
    customerId: input.customerId,
    tier: input.tier,
    status: input.status,
    expiresAt: input.expiresAt,
    stripeCustomerId: input.stripeCustomerId,
    subscriptionId: input.subscriptionId,
    updatedAt: new Date().toISOString(),
  }
}

function cloneRecord(
  record: StoreRecord,
  identity?: { email?: string; deviceId?: string }
): EntitlementRecord {
  return {
    ...record,
    email: identity?.email,
    deviceId: identity?.deviceId,
  }
}

export function readEntitlement(args: {
  customerId?: string | null
  stripeCustomerId?: string | null
  deviceId?: string | null
  email?: string | null
}): EntitlementRecord | null {
  const store = readStore()
  const email = normalizeEmail(args.email)
  const deviceId = String(args.deviceId || '').trim()
  const customerId = String(args.customerId || '').trim()
  const stripeCustomerId = String(args.stripeCustomerId || '').trim()

  if (customerId && store.customers[customerId]) {
    return cloneRecord(store.customers[customerId], { email, deviceId })
  }
  if (stripeCustomerId && store.stripeCustomers[stripeCustomerId]) {
    const linkedCustomerId = store.stripeCustomers[stripeCustomerId]
    const rec = store.customers[linkedCustomerId]
    if (rec) return cloneRecord(rec, { email, deviceId })
  }
  if (deviceId && store.devices[deviceId]) {
    return cloneRecord(store.devices[deviceId], { email, deviceId })
  }
  if (email && store.emails[email]) {
    return cloneRecord(store.emails[email], { email, deviceId })
  }
  return null
}

export function upsertEntitlement(args: {
  customerId: string
  tier: EntitlementTier
  status: EntitlementStatus
  expiresAt: number | null
  stripeCustomerId?: string | null
  subscriptionId?: string | null
  email?: string | null
  deviceId?: string | null
}): EntitlementRecord {
  const store = readStore()
  const record = toRecord({
    customerId: args.customerId,
    tier: args.tier,
    status: args.status,
    expiresAt: args.expiresAt,
    stripeCustomerId: String(args.stripeCustomerId || '').trim() || undefined,
    subscriptionId: String(args.subscriptionId || '').trim() || undefined,
  })

  store.customers[args.customerId] = record

  const email = normalizeEmail(args.email)
  if (email) {
    store.emails[email] = record
  }

  const deviceId = String(args.deviceId || '').trim()
  if (deviceId) {
    store.devices[deviceId] = record
  }

  if (record.stripeCustomerId) {
    store.stripeCustomers[record.stripeCustomerId] = args.customerId
  }

  if (record.subscriptionId) {
    store.subscriptions[record.subscriptionId] = args.customerId
  }

  writeStore(store)
  return cloneRecord(record, { email, deviceId })
}

export function entitlementFilePath(): string {
  return entitlementsFile()
}
