#!/usr/bin/env bash
set -euo pipefail

BRANCH="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"

case "$BRANCH" in
  main)
    echo "stable"
    ;;
  beta)
    echo "beta"
    ;;
  alpha|dev|develop)
    echo "alpha"
    ;;
  *)
    echo "alpha"
    ;;
esac
