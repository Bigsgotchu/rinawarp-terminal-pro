#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="${1:-https://www.rinawarptech.com}"
CANONICAL_HOST="rinawarptech.com"
SITE_HOST="$(echo "$SITE_BASE" | sed -E 's#^https?://##' | sed -E 's#/.*##')"
ROUTE_CONTRACT_FILE="${2:-scripts/contracts/route-contract.json}"
SKIP_RELEASE_CONTRACT="${SKIP_RELEASE_CONTRACT:-0}"
REQUIRE_WINDOWS_PATHS="${REQUIRE_WINDOWS_PATHS:-0}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

require_header() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if ! grep -Eiq "$pattern" "$file"; then
    echo "[smoke:prod] Missing ${label}" >&2
    cat "$file" >&2
    exit 1
  fi
}

check_redirect() {
  local path="$1"
  local expected_status="$2"
  local expected_location="$3"
  local headers_file="$tmp_dir/$(echo "$path" | tr '/:' '__').headers"

  curl -fsSI "${SITE_BASE%/}${path}" > "$headers_file"
  require_header "$headers_file" "^HTTP/[0-9.]+ ${expected_status}([[:space:]]|\$)" "${path} status ${expected_status}"
  require_header "$headers_file" "^location:[[:space:]]*${expected_location}([[:space:]]|\$)" "${path} location ${expected_location}"
  echo "[smoke:prod] ${path} -> ${expected_status} ${expected_location}"
}

check_content() {
  local path="$1"
  local expected_status="$2"
  local expected_type="$3"
  local body_pattern="$4"
  local slug
  slug="$(echo "$path" | tr '/:' '__')"
  local body_file="$tmp_dir/${slug}.body"
  local meta_file="$tmp_dir/${slug}.meta"

  curl -fsSL -o "$body_file" -w '%{http_code}\n%{content_type}\n%{url_effective}\n' "${SITE_BASE%/}${path}" > "$meta_file"

  local final_status final_type final_url
  final_status="$(sed -n '1p' "$meta_file")"
  final_type="$(sed -n '2p' "$meta_file")"
  final_url="$(sed -n '3p' "$meta_file")"

  if [[ "$final_status" != "$expected_status" ]]; then
    echo "[smoke:prod] ${path} final status mismatch: expected ${expected_status}, got ${final_status}" >&2
    cat "$meta_file" >&2
    exit 1
  fi

  if [[ "$final_type" != ${expected_type}* ]]; then
    echo "[smoke:prod] ${path} final content-type mismatch: expected prefix ${expected_type}, got ${final_type}" >&2
    cat "$meta_file" >&2
    exit 1
  fi

  if [[ "$final_url" != https://${CANONICAL_HOST}/* && "$final_url" != https://${SITE_HOST}/* ]]; then
    echo "[smoke:prod] ${path} final URL escaped expected domains (${CANONICAL_HOST}, ${SITE_HOST}): ${final_url}" >&2
    exit 1
  fi

  if ! rg -q "$body_pattern" "$body_file"; then
    echo "[smoke:prod] ${path} body check failed for pattern: ${body_pattern}" >&2
    head -n 20 "$body_file" >&2 || true
    exit 1
  fi

  echo "[smoke:prod] ${path} -> ${final_status} ${final_type} (${final_url})"
}

check_single_hop_redirect() {
  local path="$1"
  local expected_location="$2"
  local headers_file="$tmp_dir/$(echo "$path" | tr '/:' '__').single-hop.headers"
  local actual_location
  local absolute_expected="https://${CANONICAL_HOST}${expected_location}"
  curl -fsSI "${SITE_BASE%/}${path}" > "$headers_file"
  require_header "$headers_file" "^HTTP/[0-9.]+ 301([[:space:]]|\$)" "${path} status 301"
  actual_location="$(awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/^[Ll]ocation:[[:space:]]*/, ""); sub(/[[:space:]]*$/, ""); print; exit}' "$headers_file")"
  if [[ "$actual_location" != "$expected_location" && "$actual_location" != "$absolute_expected" ]]; then
    local canonical_hop="https://${CANONICAL_HOST}${path}"
    if [[ "$SITE_HOST" != "$CANONICAL_HOST" && "$actual_location" == "$canonical_hop" ]]; then
      curl -fsSI "$canonical_hop" > "$headers_file.canonical"
      require_header "$headers_file.canonical" "^HTTP/[0-9.]+ 301([[:space:]]|\$)" "${path} canonical status 301"
      local canonical_location
      canonical_location="$(awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/^[Ll]ocation:[[:space:]]*/, ""); sub(/[[:space:]]*$/, ""); print; exit}' "$headers_file.canonical")"
      if [[ "$canonical_location" != "$expected_location" && "$canonical_location" != "$absolute_expected" ]]; then
        require_header "$headers_file.canonical" "^location:[[:space:]]*${expected_location}([[:space:]]|\$)" "${path} canonical location ${expected_location}"
      fi
      echo "[smoke:prod] ${path} -> 301 ${actual_location} -> 301 ${expected_location}"
      return
    fi
    require_header "$headers_file" "^location:[[:space:]]*${expected_location}([[:space:]]|\$)" "${path} location ${expected_location}"
  fi
  echo "[smoke:prod] ${path} -> 301 ${expected_location}"
}

check_canonical() {
  local path="$1"
  local expected="$2"
  local body_file="$tmp_dir/$(echo "$path" | tr '/:' '__').canonical.body"
  curl -fsSL "${SITE_BASE%/}${path}" -o "$body_file"
  if ! rg -q "<link rel=\"canonical\" href=\"${expected}\">" "$body_file"; then
    echo "[smoke:prod] canonical mismatch for ${path}; expected ${expected}" >&2
    rg -n "rel=\"canonical\"" "$body_file" >&2 || true
    exit 1
  fi
  echo "[smoke:prod] canonical ${path} -> ${expected}"
}

check_robots_and_sitemap() {
  local robots_file="$tmp_dir/robots.txt"
  local sitemap_file="$tmp_dir/sitemap.xml"
  curl -fsSL "${SITE_BASE%/}/robots.txt" -o "$robots_file"
  curl -fsSL "${SITE_BASE%/}/sitemap.xml" -o "$sitemap_file"

  rg -q "Sitemap: https://rinawarptech.com/sitemap.xml" "$robots_file" || {
    echo "[smoke:prod] robots.txt missing canonical sitemap directive" >&2
    cat "$robots_file" >&2
    exit 1
  }
  rg -q "<loc>https://rinawarptech.com/support/</loc>" "$sitemap_file" || {
    echo "[smoke:prod] sitemap missing /support/" >&2
    cat "$sitemap_file" >&2
    exit 1
  }
  if rg -q "<loc>https://rinawarptech.com/music-video-creator/?</loc>" "$sitemap_file"; then
    echo "[smoke:prod] sitemap still includes stale music-video-creator URL" >&2
    cat "$sitemap_file" >&2
    exit 1
  fi
  if rg -q "<loc>https://rinawarptech.com/team/?</loc>" "$sitemap_file"; then
    echo "[smoke:prod] sitemap still includes /team/" >&2
    cat "$sitemap_file" >&2
    exit 1
  fi
  echo "[smoke:prod] robots + sitemap integrity OK"
}

check_release_contract() {
  local json_file="$tmp_dir/latest.json"
  local yml_file="$tmp_dir/latest.yml"
  local yml_linux_file="$tmp_dir/latest-linux.yml"

  curl -fsSL "${SITE_BASE%/}/releases/latest.json" -o "$json_file"
  curl -fsSL "${SITE_BASE%/}/releases/latest.yml" -o "$yml_file"
  curl -fsSL "${SITE_BASE%/}/releases/latest-linux.yml" -o "$yml_linux_file"

  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const requireWindows = process.argv[2] === "1";
    const required = ["version", "pub_date", "files", "platforms"];
    for (const key of required) {
      if (!(key in data)) {
        console.error(`[smoke:prod] latest.json missing key: ${key}`);
        process.exit(1);
      }
    }
    if (!/^\d+\.\d+\.\d+([-.][A-Za-z0-9]+)?$/.test(String(data.version || ""))) {
      console.error(`[smoke:prod] latest.json invalid version: ${data.version}`);
      process.exit(1);
    }
    const linuxPath = data?.files?.linux?.path;
    if (!linuxPath) {
      console.error("[smoke:prod] latest.json missing linux file path");
      process.exit(1);
    }
    const windowsPath = data?.files?.windows?.path;
    if (requireWindows && !windowsPath) {
      console.error("[smoke:prod] latest.json missing windows file path while REQUIRE_WINDOWS_PATHS=1");
      process.exit(1);
    }
    if (!requireWindows && !windowsPath) {
      console.warn("[smoke:prod] latest.json has no windows path (allowed while Windows artifacts are not published)");
    }
    console.log(`[smoke:prod] latest.json contract OK (version ${data.version})`);
  ' "$json_file" "$REQUIRE_WINDOWS_PATHS"

  for file in "$yml_file" "$yml_linux_file"; do
    rg -q "^version:[[:space:]]" "$file" || {
      echo "[smoke:prod] missing version in $(basename "$file")" >&2
      cat "$file" >&2
      exit 1
    }
    rg -q "^sha512:[[:space:]]" "$file" || {
      echo "[smoke:prod] missing sha512 in $(basename "$file")" >&2
      cat "$file" >&2
      exit 1
    }
    rg -q "^path:[[:space:]]" "$file" || {
      echo "[smoke:prod] missing path in $(basename "$file")" >&2
      cat "$file" >&2
      exit 1
    }
  done
  echo "[smoke:prod] release feed contract OK"
}

load_contract_and_validate_redirects() {
  if [[ ! -f "$ROUTE_CONTRACT_FILE" ]]; then
    echo "[smoke:prod] route contract file missing: $ROUTE_CONTRACT_FILE" >&2
    exit 1
  fi

  local redirects
  redirects="$(node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const json = JSON.parse(fs.readFileSync(path, "utf8"));
    const redirects = json.redirects || {};
    for (const [from, to] of Object.entries(redirects)) {
      console.log(`${from}\t${to}`);
    }
  ' "$ROUTE_CONTRACT_FILE")"

  while IFS=$'\t' read -r from to; do
    [[ -z "$from" ]] && continue
    check_single_hop_redirect "$from" "$to"
  done <<< "$redirects"
}

load_contract_and_validate_canonicals() {
  local canonicals
  canonicals="$(node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const json = JSON.parse(fs.readFileSync(path, "utf8"));
    const canonicals = json.canonicals || {};
    for (const [route, canonical] of Object.entries(canonicals)) {
      console.log(`${route}\t${canonical}`);
    }
  ' "$ROUTE_CONTRACT_FILE")"

  while IFS=$'\t' read -r route canonical; do
    [[ -z "$route" ]] && continue
    check_canonical "$route" "$canonical"
  done <<< "$canonicals"
}

check_header_for_html_path() {
  local path="$1"
  local header_name_regex="$2"
  local expected_regex="$3"
  local headers_file="$tmp_dir/$(echo "$path" | tr '/:' '__').headers"
  curl -fsSI "${SITE_BASE%/}${path}" > "$headers_file"
  if ! rg -qi "^${header_name_regex}:[[:space:]]*${expected_regex}" "$headers_file"; then
    echo "[smoke:prod] header assertion failed for ${path}: ${header_name_regex} ~ ${expected_regex}" >&2
    cat "$headers_file" >&2
    exit 1
  fi
  echo "[smoke:prod] header assertion OK for ${path}: ${header_name_regex}"
}

echo "[smoke:prod] Verifying route contract redirects"
load_contract_and_validate_redirects

echo "[smoke:prod] Verifying matter-intelligence redirects"
check_redirect "/matter-intelligence" "301" "/products/"
check_redirect "/matter-intelligence/pricing" "301" "/products/"
check_redirect "/matter-intelligence/security" "301" "/products/"

echo "[smoke:prod] Verifying product-family pages"
check_content "/products" "200" "text/html" 'RinaWarp Products'
check_content "/support" "200" "text/html" 'RinaWarp Support|Send feedback|Support & feedback'

echo "[smoke:prod] Verifying canonical tags and HTML cache directives"
load_contract_and_validate_canonicals
check_header_for_html_path "/" "cache-control" "public,[[:space:]]*max-age=0,[[:space:]]*must-revalidate"
check_header_for_html_path "/support/" "content-type" "text/html"

echo "[smoke:prod] Verifying robots and sitemap integrity"
check_robots_and_sitemap

if [[ "$SKIP_RELEASE_CONTRACT" == "1" ]]; then
  echo "[smoke:prod] Skipping updater feed contract checks (SKIP_RELEASE_CONTRACT=1)"
else
  echo "[smoke:prod] Verifying first-party updater feeds and release contract"
  check_content "/releases/latest.json" "200" "application/json" '"version"[[:space:]]*:[[:space:]]*"'
  check_content "/releases/latest.yml" "200" "application/x-yaml" '^version:[[:space:]]'
  check_content "/releases/latest-linux.yml" "200" "application/x-yaml" '^version:[[:space:]]'
  check_release_contract
fi

echo "[smoke:prod] PASS"
