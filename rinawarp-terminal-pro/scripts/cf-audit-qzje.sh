#!/usr/bin/env bash
set -euo pipefail

: "${CF_API_TOKEN:?set CF_API_TOKEN}"
: "${CF_ACCOUNT_ID:?set CF_ACCOUNT_ID}"
: "${CF_PAGES_PROJECT:?set CF_PAGES_PROJECT}"
: "${CF_ZONE_NAME:?set CF_ZONE_NAME (e.g. rinawarptech.com)}"

API="https://api.cloudflare.com/client/v4"
HDR=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")

echo "== 1) Zone lookup for ${CF_ZONE_NAME} =="
ZONE_JSON="$(curl -fsS "${API}/zones?name=${CF_ZONE_NAME}" "${HDR[@]}")" || true
ZONE_ID="$(echo "$ZONE_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)"
if [[ -z "${ZONE_ID}" ]]; then
  echo "❌ Could not determine zone id. Token likely missing Zone:Read, or zone name mismatch."
else
  echo "✅ Zone ID: ${ZONE_ID}"
fi
echo

echo "== 2) Pages project domains (what should be serving www) =="
PAGES_DOMAINS="$(curl -fsS "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains" "${HDR[@]}" || true)"
echo "$PAGES_DOMAINS" | head -c 2000; echo
echo

echo "== 3) Pages production deployments (top 3) =="
DEPLOY_LIST="$(curl -fsS "${API}/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments" "${HDR[@]}" || true)"
echo "$DEPLOY_LIST" | head -c 2000; echo
echo

echo "== 4) DNS records for www (should be CNAME to *.pages.dev, proxied OK) =="
if [[ -n "${ZONE_ID}" ]]; then
  DNS_WWW="$(curl -fsS "${API}/zones/${ZONE_ID}/dns_records?type=CNAME&name=www.${CF_ZONE_NAME}" "${HDR[@]}" || true)"
  DNS_WWW_A="$(curl -fsS "${API}/zones/${ZONE_ID}/dns_records?type=A&name=www.${CF_ZONE_NAME}" "${HDR[@]}" || true)"
  echo "-- CNAME --"; echo "$DNS_WWW" | head -c 1200; echo
  echo "-- A --"; echo "$DNS_WWW_A" | head -c 1200; echo
else
  echo "⚠️ Skipping DNS audit: no zone id"
fi
echo

echo "== 5) Check for rule interceptors (Redirect/Bulk/Transform) =="
if [[ -n "${ZONE_ID}" ]]; then
  echo "-- Bulk Redirects (list) --"
  curl -fsS "${API}/zones/${ZONE_ID}/bulk_redirects/redirects" "${HDR[@]}" 2>/dev/null | head -c 1500 || echo "⚠️ No access or none configured."
  echo; echo

  echo "-- Zone Rulesets (list) --"
  curl -fsS "${API}/zones/${ZONE_ID}/rulesets" "${HDR[@]}" 2>/dev/null | head -c 1500 || echo "⚠️ No access or endpoint blocked for this token."
  echo; echo
else
  echo "⚠️ Skipping ruleset audit: no zone id"
fi
echo

echo "== 6) Live HTTP proof: compare pages.dev vs www for /qzje/ =="
echo "-- Pages.dev (replace with your current prod deployment host if needed) --"
echo "Try: curl -sI https://YOUR_DEPLOYMENT.rinawarptech-website.pages.dev/qzje/ | egrep -i '^(HTTP|server|location|cf-cache-status|content-type)'"
echo
echo "-- www --"
curl -sI "https://www.${CF_ZONE_NAME}/qzje/" | egrep -i '^(HTTP|server|location|cf-cache-status|content-type|cf-ray)' || true
echo
