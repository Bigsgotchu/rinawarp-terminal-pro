#!/usr/bin/env python3
"""
Patch installed Kilo Code VS Code extension bundles so Node fetch requests that
send a body include `duplex: "half"`.

This is a local compatibility repair for Kilo releases that bundle request code
without the duplex option required by newer Node/VS Code runtimes.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys


PATTERNS = (
    (
        'redirect:"follow",...a,body:a.serializedBody,headers:e,signal:t}',
        'redirect:"follow",...a,body:a.serializedBody,headers:e,signal:t,duplex:"half"}',
    ),
    (
        'redirect:"follow",...a,body:jN(a)}',
        'redirect:"follow",...a,body:jN(a),duplex:"half"}',
    ),
    (
        'redirect:"follow",...Y,body:Y.serializedBody,headers:e,signal:t}',
        'redirect:"follow",...Y,body:Y.serializedBody,headers:e,signal:t,duplex:"half"}',
    ),
    (
        'redirect:"follow",...Y,body:GW(Y)}',
        'redirect:"follow",...Y,body:GW(Y),duplex:"half"}',
    ),
)

FETCH_SHIM = """"use strict";(()=>{if(globalThis.__kiloDuplexCompatApplied)return;const e=(t,i)=>!i||i.duplex!==void 0||i.body===void 0||i.body===null?i:{...i,duplex:"half"};const f=globalThis.fetch?.bind(globalThis);f&&(globalThis.fetch=(t,i)=>f(t,e(t,i)));const R=globalThis.Request;R&&(globalThis.Request=class extends R{constructor(t,i){super(t,e(t,i))}});globalThis.__kiloDuplexCompatApplied=!0;})();"""


def find_extension_files(root: Path) -> list[Path]:
    return sorted(root.glob("kilocode.kilo-code-*/dist/extension.js"))


def patch_file(path: Path, dry_run: bool) -> tuple[bool, int]:
    original = path.read_text()
    updated = original
    replacements = 0

    for old, new in PATTERNS:
        if old in updated:
            count_before = updated.count(old)
            updated = updated.replace(old, new)
            replacements += count_before

    # Newer Kilo bundles still contain fetch/request paths that bypass the
    # explicit request patterns above. Install a one-time shim at startup so
    # any body-bearing Request/fetch call gets duplex:"half".
    if "globalThis.__kiloDuplexCompatApplied" not in updated:
        if updated.startswith('"use strict";'):
            updated = updated.replace('"use strict";', FETCH_SHIM, 1)
            replacements += 1
        else:
            updated = FETCH_SHIM + updated
            replacements += 1

    if updated == original:
        return False, 0

    if not dry_run:
        backup = path.with_suffix(path.suffix + ".bak-duplex")
        if not backup.exists():
            backup.write_text(original)
        path.write_text(updated)

    return True, replacements


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--extensions-root",
        default=str(Path.home() / ".vscode" / "extensions"),
        help="VS Code extensions root to scan",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing files",
    )
    args = parser.parse_args()

    root = Path(args.extensions_root).expanduser()
    files = find_extension_files(root)

    if not files:
        print(f"No Kilo Code extension bundles found under {root}")
        return 1

    print(f"Scanning {len(files)} Kilo Code bundle(s) under {root}")
    changed_any = False

    for path in files:
        changed, replacements = patch_file(path, args.dry_run)
        if changed:
            changed_any = True
            mode = "WOULD PATCH" if args.dry_run else "PATCHED"
            print(f"{mode} {path} ({replacements} replacement(s))")
        else:
            print(f"OK {path} (already patched or unaffected)")

    if args.dry_run and changed_any:
        print("Dry run complete: rerun without --dry-run to apply the patch.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
