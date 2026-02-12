#!/usr/bin/env bash
set -euo pipefail

: "${CF_API_TOKEN:?set CF_API_TOKEN}"
: "${CF_ACCOUNT_ID:?set CF_ACCOUNT_ID}"
: "${CF_PAGES_PROJECT:?set CF_PAGES_PROJECT}" # e.g. rinawarptech-website

API="https://api.cloudflare.com/client/v4"
H=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")

need_domain () {
  local domain="$1"
  echo "== Ensuring domain exists: ${domain}"

  # List current domains
  local list
  list="$(curl -fsS "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains" "${H[@]}")"

  if echo "$list" | grep -q "\"name\":\"${domain}\""; then
    echo "   -> already present"
  else
    echo "   -> adding domain"
    curl -fsS -X POST \
      "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains" \
      "${H[@]}" \
      --data "{\"name\":\"${domain}\"}" \
      >/dev/null
    echo "   -> added"
  fi

  echo "== Checking domain status: ${domain}"
  curl -fsS \
    "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains/${domain}" \
    "${H[@]}" | sed -n '1,160p'

  echo "== Retrying validation (PATCH): ${domain}"
  curl -fsS -X PATCH \
    "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains/${domain}" \
    "${H[@]}" \
    --data "{}" \
    >/dev/null

  echo "   -> validation retry requested"
  echo
}

need_domain "www.rinawarptech.com"
need_domain "rinawarptech.com"

echo "== Done. Now test:"
echo "curl -sIL https://www.rinawarptech.com/qzje/ | sed -n '1,12p'"
echo "curl -sIL https://www.rinawarptech.com/_build.txt | head"
