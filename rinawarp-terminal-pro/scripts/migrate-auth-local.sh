#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"
MIGRATION_FILE="$WORKER_DIR/migrations/0002_auth_local_accounts.sql"
DB_NAME="${DB_NAME:-rinawarp-prod}"

[[ -f "$MIGRATION_FILE" ]] || { echo "❌ Missing migration file: $MIGRATION_FILE"; exit 1; }

echo "== Applying migration to D1 ($DB_NAME) =="
cd "$WORKER_DIR"
npx wrangler d1 execute "$DB_NAME" --remote --file "$MIGRATION_FILE"

echo "== Migration applied =="
