#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
INSTALLER_DIR="$APP_DIR/dist-electron/installer"
VERSION="$(node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8')); process.stdout.write(pkg.version)")"
TAG="v$VERSION"
REPO="${GITHUB_REPOSITORY:-Bigsgotchu/rinawarp-terminal-pro}"
ALLOW_DIRTY_RELEASE="${RINAWARP_ALLOW_DIRTY_RELEASE:-0}"

cd "$ROOT_DIR"

if command -v git >/dev/null 2>&1; then
  DIRTY_OUTPUT="$(
    git status --short --untracked-files=all -- \
      apps/terminal-pro/package.json \
      apps/terminal-pro/src \
      apps/terminal-pro/scripts \
      apps/terminal-pro/tests \
      apps/terminal-pro/test \
      packages \
      docs \
      scripts \
      website \
      package.json \
      tsconfig.json \
      2>/dev/null || true
  )"
  if [[ -n "$DIRTY_OUTPUT" && "$ALLOW_DIRTY_RELEASE" != "1" ]]; then
    echo "[publish:desktop-release] Refusing to publish v$VERSION from a dirty workspace." >&2
    echo "[publish:desktop-release] These changes may deserve a new version bump before release:" >&2
    echo "$DIRTY_OUTPUT" >&2
    echo "[publish:desktop-release] If you intentionally want to reuse this version, rerun with RINAWARP_ALLOW_DIRTY_RELEASE=1." >&2
    exit 1
  fi
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "[publish:desktop-release] GitHub CLI is required for GitHub Releases publishing." >&2
  exit 1
fi

corepack pnpm --filter rinawarp-terminal-pro run release:metadata

artifacts=(
  "$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.AppImage"
  "$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.deb"
  "$INSTALLER_DIR/latest-linux.yml"
  "$INSTALLER_DIR/latest.yml"
  "$INSTALLER_DIR/latest.json"
  "$INSTALLER_DIR/SHASUMS256.txt"
)

# Add macOS artifacts if present
if [[ -f "$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.dmg" ]]; then
  artifacts+=("$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.dmg")
fi

# Add Windows artifacts if present
if [[ -f "$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe" ]]; then
  artifacts+=("$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe")
  if [[ -f "$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap" ]]; then
    artifacts+=("$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap")
  fi
fi

for artifact in "${artifacts[@]}"; do
  if [[ ! -f "$artifact" ]]; then
    echo "[publish:desktop-release] Missing required release artifact: $artifact" >&2
    exit 1
  fi
done

release_notes_args=(--notes "RinaWarp Terminal Pro $VERSION desktop release.")
if [[ -f "$ROOT_DIR/RELEASE_NOTES.md" ]]; then
  release_notes_args=(--notes-file "$ROOT_DIR/RELEASE_NOTES.md")
fi

if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  gh release create "$TAG" \
    --repo "$REPO" \
    --title "RinaWarp Terminal Pro $VERSION" \
    "${release_notes_args[@]}"
fi

gh release upload "$TAG" "${artifacts[@]}" --repo "$REPO" --clobber

echo "[publish:desktop-release] Published RinaWarp Terminal Pro $VERSION to GitHub Release $TAG"
