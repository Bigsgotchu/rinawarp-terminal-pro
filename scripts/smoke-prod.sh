#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="${1:-https://www.rinawarptech.com}"

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

  if [[ "$final_url" != https://rinawarptech.com/* ]]; then
    echo "[smoke:prod] ${path} final URL escaped the canonical domain: ${final_url}" >&2
    exit 1
  fi

  if ! rg -q "$body_pattern" "$body_file"; then
    echo "[smoke:prod] ${path} body check failed for pattern: ${body_pattern}" >&2
    head -n 20 "$body_file" >&2 || true
    exit 1
  fi

  echo "[smoke:prod] ${path} -> ${final_status} ${final_type} (${final_url})"
}

echo "[smoke:prod] Verifying canonical download path"
check_redirect "/downloads" "301" "/download/"

echo "[smoke:prod] Verifying first-party updater feeds"
check_content "/releases/latest.json" "200" "application/json" '"version"[[:space:]]*:[[:space:]]*"'
check_content "/releases/latest.yml" "200" "application/x-yaml" '^version:[[:space:]]'
check_content "/releases/latest-linux.yml" "200" "application/x-yaml" '^version:[[:space:]]'

echo "[smoke:prod] PASS"
