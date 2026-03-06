import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

type IdempotencyRecord = {
  key: string;
  user_id: string;
  route: string;
  status: number;
  response: unknown;
  created_at: string;
  expires_at_ms: number;
};

type IdempotencyDb = {
  version: 1;
  records: IdempotencyRecord[];
};

const TTL_MS = 24 * 60 * 60 * 1000;

function filePath(): string {
  return path.join(paths().baseDir, "idempotency-keys.json");
}

function loadDb(): IdempotencyDb {
  const fp = filePath();
  if (!fs.existsSync(fp)) return { version: 1, records: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as IdempotencyDb;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records)) return { version: 1, records: [] };
    return parsed;
  } catch {
    return { version: 1, records: [] };
  }
}

function saveDb(db: IdempotencyDb) {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function purgeExpired(db: IdempotencyDb): void {
  const now = Date.now();
  db.records = db.records.filter((r) => r.expires_at_ms > now);
}

export function getIdempotentReplay(args: {
  key: string;
  userId: string;
  route: string;
}): { status: number; response: unknown } | null {
  const db = loadDb();
  purgeExpired(db);
  saveDb(db);
  const found = db.records.find((r) => r.key === args.key && r.user_id === args.userId && r.route === args.route);
  if (!found) return null;
  return { status: found.status, response: found.response };
}

export function storeIdempotentResponse(args: {
  key: string;
  userId: string;
  route: string;
  status: number;
  response: unknown;
}): void {
  const db = loadDb();
  purgeExpired(db);
  db.records.push({
    key: args.key,
    user_id: args.userId,
    route: args.route,
    status: args.status,
    response: args.response,
    created_at: new Date().toISOString(),
    expires_at_ms: Date.now() + TTL_MS,
  });
  db.records = db.records.slice(-5000);
  saveDb(db);
}
