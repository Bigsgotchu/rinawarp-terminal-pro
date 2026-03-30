#!/usr/bin/env python3
"""
Prune stale Continue schema entries from VS Code user settings and patch the
installed RinaWarp VS Code extension so license activation persists correctly
for Auto Mode / status checks.
"""

from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
import sys


HOME = Path.home()
USER_SETTINGS = HOME / ".config" / "Code" / "User" / "settings.json"
EXTENSIONS_DIR = HOME / ".vscode" / "extensions"
RINAWARP_DIR = EXTENSIONS_DIR / "rinawarp.rinawarp-1.0.0"
RINAWARP_SRC = RINAWARP_DIR / "src" / "extension.ts"
RINAWARP_OUT = RINAWARP_DIR / "out" / "extension.js"


def backup_file(path: Path) -> Path:
    backup = path.with_suffix(path.suffix + ".bak-rinawarp-fix")
    if not backup.exists():
        shutil.copy2(path, backup)
    return backup


def find_latest_continue_schema() -> str | None:
    candidates = sorted(EXTENSIONS_DIR.glob("continue.continue-*/config-yaml-schema.json"))
    if not candidates:
        return None
    return candidates[-1].as_uri()


def patch_user_settings() -> str:
    data = json.loads(USER_SETTINGS.read_text())
    changed = False

    yaml_schemas = data.get("yaml.schemas")
    if isinstance(yaml_schemas, dict):
        latest = find_latest_continue_schema()
        kept: dict[str, object] = {}
        continue_patterns: object | None = None

        for key, value in yaml_schemas.items():
            if "/continue.continue-" in key and key.endswith("/config-yaml-schema.json"):
                if continue_patterns is None:
                    continue_patterns = value
                changed = True
                continue
            kept[key] = value

        if latest and continue_patterns is not None:
            kept[latest] = continue_patterns
            changed = True

        if kept:
            data["yaml.schemas"] = kept
        else:
            data.pop("yaml.schemas", None)

    if not changed:
        return "user settings already clean"

    backup_file(USER_SETTINGS)
    USER_SETTINGS.write_text(json.dumps(data, indent=2) + "\n")
    return "pruned stale Continue schema entries"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"could not find expected block for {label}")
    return text.replace(old, new, 1)


def patch_rinawarp_source(path: Path) -> str:
    text = path.read_text()
    original = text

    text = replace_once(
        text,
        """  private updateStatus(state: string, text: string): void {\n    this.statusBar.text = `$(robot) ${text}`;\n    this.statusBar.tooltip = `RinaWarp - ${state}`;\n  }\n""",
        """  private updateStatus(state: string, text: string): void {\n    this.statusBar.text = `$(robot) ${text}`;\n    this.statusBar.tooltip = `RinaWarp - ${state}`;\n  }\n\n  private async persistLicenseKey(licenseKey: string): Promise<void> {\n    await vscode.workspace\n      .getConfiguration('rinawarp')\n      .update('licenseKey', licenseKey, vscode.ConfigurationTarget.Global);\n  }\n\n  private applyLicenseKey(licenseKey: string): void {\n    this.licenseKey = licenseKey;\n    this.client.defaults.headers.common['Authorization'] = `Bearer ${licenseKey}`;\n  }\n""",
        "source helpers",
    )

    text = replace_once(
        text,
        """      if (response.data.valid) {\n        this.licenseKey = licenseKey;\n        this.updateStatus('connected', 'RinaWarp: Connected');\n        vscode.window.showInformationMessage(`RinaWarp activated! Tier: ${response.data.tier}`);\n        return true;\n      }\n""",
        """      if (response.data.valid) {\n        this.applyLicenseKey(licenseKey);\n        await this.persistLicenseKey(licenseKey);\n        this.updateStatus('connected', 'RinaWarp: Connected');\n        vscode.window.showInformationMessage(`RinaWarp activated! Tier: ${response.data.tier}`);\n        return true;\n      }\n""",
        "source activateLicense success",
    )

    text = replace_once(
        text,
        """  async validateLicense(): Promise<boolean> {\n    try {\n      const response = await this.client.get('/api/license/validate');\n      return response.data.valid;\n    } catch {\n      return false;\n    }\n  }\n""",
        """  async validateLicense(): Promise<boolean> {\n    try {\n      const response = await this.client.get('/api/license/validate');\n      const valid = !!response.data.valid;\n      this.updateStatus(valid ? 'connected' : 'disconnected', valid ? 'RinaWarp: Connected' : 'RinaWarp: Not Connected');\n      return valid;\n    } catch {\n      this.updateStatus('disconnected', 'RinaWarp: Not Connected');\n      return false;\n    }\n  }\n""",
        "source validateLicense",
    )

    text = replace_once(
        text,
        """export async function activate(_context: vscode.ExtensionContext): Promise<void> {\n  client = new RinaWarpClient();\n\n  // Register commands\n""",
        """export async function activate(_context: vscode.ExtensionContext): Promise<void> {\n  client = new RinaWarpClient();\n  await client.validateLicense();\n\n  // Register commands\n""",
        "source activate",
    )

    if text == original:
        return f"{path.name} already patched"

    backup_file(path)
    path.write_text(text)
    return f"patched {path.name}"


def patch_rinawarp_output(path: Path) -> str:
    text = path.read_text()
    original = text

    text = replace_once(
        text,
        """    updateStatus(state, text) {\n        this.statusBar.text = `$(robot) ${text}`;\n        this.statusBar.tooltip = `RinaWarp - ${state}`;\n    }\n""",
        """    updateStatus(state, text) {\n        this.statusBar.text = `$(robot) ${text}`;\n        this.statusBar.tooltip = `RinaWarp - ${state}`;\n    }\n    async persistLicenseKey(licenseKey) {\n        await vscode.workspace\n            .getConfiguration('rinawarp')\n            .update('licenseKey', licenseKey, vscode.ConfigurationTarget.Global);\n    }\n    applyLicenseKey(licenseKey) {\n        this.licenseKey = licenseKey;\n        this.client.defaults.headers.common['Authorization'] = `Bearer ${licenseKey}`;\n    }\n""",
        "output helpers",
    )

    text = replace_once(
        text,
        """            if (response.data.valid) {\n                this.licenseKey = licenseKey;\n                this.updateStatus('connected', 'RinaWarp: Connected');\n                vscode.window.showInformationMessage(`RinaWarp activated! Tier: ${response.data.tier}`);\n                return true;\n            }\n""",
        """            if (response.data.valid) {\n                this.applyLicenseKey(licenseKey);\n                await this.persistLicenseKey(licenseKey);\n                this.updateStatus('connected', 'RinaWarp: Connected');\n                vscode.window.showInformationMessage(`RinaWarp activated! Tier: ${response.data.tier}`);\n                return true;\n            }\n""",
        "output activateLicense success",
    )

    text = replace_once(
        text,
        """    async validateLicense() {\n        try {\n            const response = await this.client.get('/api/license/validate');\n            return response.data.valid;\n        }\n        catch {\n            return false;\n        }\n    }\n""",
        """    async validateLicense() {\n        try {\n            const response = await this.client.get('/api/license/validate');\n            const valid = !!response.data.valid;\n            this.updateStatus(valid ? 'connected' : 'disconnected', valid ? 'RinaWarp: Connected' : 'RinaWarp: Not Connected');\n            return valid;\n        }\n        catch {\n            this.updateStatus('disconnected', 'RinaWarp: Not Connected');\n            return false;\n        }\n    }\n""",
        "output validateLicense",
    )

    text = replace_once(
        text,
        """async function activate(_context) {\n    client = new RinaWarpClient();\n    // Register commands\n""",
        """async function activate(_context) {\n    client = new RinaWarpClient();\n    await client.validateLicense();\n    // Register commands\n""",
        "output activate",
    )

    if text == original:
        return f"{path.name} already patched"

    backup_file(path)
    path.write_text(text)
    return f"patched {path.name}"


def main() -> int:
    actions: list[str] = []
    actions.append(patch_user_settings())
    actions.append(patch_rinawarp_source(RINAWARP_SRC))
    actions.append(patch_rinawarp_output(RINAWARP_OUT))
    print("\n".join(actions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
