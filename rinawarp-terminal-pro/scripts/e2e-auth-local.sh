#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"
DB_NAME="${DB_NAME:-rinawarp-prod}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"

TS="$(date +%s)"
EMAIL="e2e.auth.${TS}@example.com"
NAME="E2E Auth User"
PASSWORD="E2EPassword123!"
CUSTOMER_ID="local_e2e_${TS}"

echo "== E2E Auth (Local Password) =="
echo "BASE: $BASE"
echo "API : $API"
echo "DB  : $DB_NAME"
echo "EMAIL: $EMAIL"

gen_hash() {
  node - <<'NODE'
const crypto = require('crypto');
const password = process.env.PASSWORD;
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
process.stdout.write(JSON.stringify({ salt: salt.toString('base64'), hash }));
NODE
}

SECRETS_JSON="$(PASSWORD="$PASSWORD" gen_hash)"
SALT="$(printf '%s' "$SECRETS_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(j.salt)})')"
HASH="$(printf '%s' "$SECRETS_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(j.hash)})')"
NOW_MS="$(( $(date +%s) * 1000 ))"

SQL_SEED="
CREATE TABLE IF NOT EXISTS auth_local_accounts (
  email TEXT PRIMARY KEY,
  name TEXT,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  customer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT OR REPLACE INTO users (email, customer_id, created_at, updated_at)
VALUES ('$EMAIL', '$CUSTOMER_ID', $NOW_MS, $NOW_MS);
INSERT OR REPLACE INTO auth_local_accounts (email, name, password_salt, password_hash, email_verified, customer_id, created_at, updated_at)
VALUES ('$EMAIL', '$NAME', '$SALT', '$HASH', 1, '$CUSTOMER_ID', $NOW_MS, $NOW_MS);
"

SQL_CLEAN="
DELETE FROM sessions WHERE email = '$EMAIL';
DELETE FROM auth_local_accounts WHERE email = '$EMAIL';
DELETE FROM users WHERE email = '$EMAIL';
"

cleanup() {
  echo "== Cleanup =="
  (cd "$WORKER_DIR" && npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL_CLEAN") >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "== 1) Seed verified local account =="
cd "$WORKER_DIR"
npx wrangler d1 execute "$DB_NAME" --remote --command "$SQL_SEED" >/dev/null
echo "✅ Seeded"

echo "== 2) Password login =="
AUTH_JSON="$(curl -fsS -X POST "$API/api/auth/start" -H 'content-type: application/json' --data '{"mode":"password","email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}')"
SESSION_TOKEN="$(printf '%s' "$AUTH_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(j.session_token||"")})')"
if [[ -z "$SESSION_TOKEN" ]]; then
  echo "❌ Missing session token"
  echo "$AUTH_JSON"
  exit 1
fi
echo "✅ Password login ok"

echo "== 3) /api/me with bearer session =="
ME_JSON="$(curl -fsS "$API/api/me" -H "Authorization: Bearer $SESSION_TOKEN")"
ME_OK="$(printf '%s' "$ME_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(Boolean(j.ok)))})')"
ME_EMAIL="$(printf '%s' "$ME_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(j.email||"")})')"
if [[ "$ME_OK" != "true" || "$ME_EMAIL" != "$EMAIL" ]]; then
  echo "❌ /api/me failed"
  echo "$ME_JSON"
  exit 1
fi
echo "✅ /api/me returned expected account"

echo "== 4) UI route sanity =="
for p in /login/ /signup/ /account/; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE$p")"
  [[ "$code" == "200" ]] || { echo "❌ $BASE$p -> $code"; exit 1; }
  echo "✅ $BASE$p -> $code"
done

echo "✅ PASS: e2e auth local flow"
