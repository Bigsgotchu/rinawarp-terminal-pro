#!/usr/bin/env python3
"""
/tools/device_diag.py

Collects read-only diagnostics for attached storage devices.
- Windows: Get-Disk, Get-PhysicalDisk, wmic fallback
- macOS: diskutil list/info/verify
- Linux: lsblk, dmesg tail, smartctl if present (no installs), blkid

Notes:
- This script DOES NOT repair anything.
- Some commands require admin/root to see full details.
"""

from __future__ import annotations

import platform
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class Cmd:
    title: str
    argv: list[str]
    requires_admin_hint: str | None = None


def run_cmd(cmd: Cmd) -> str:
    header = f"\n===== {cmd.title} =====\n$ {' '.join(cmd.argv)}\n"
    try:
        proc = subprocess.run(
            cmd.argv,
            capture_output=True,
            text=True,
            check=False,
        )
        out = proc.stdout.strip()
        err = proc.stderr.strip()
        parts = [header]
        if cmd.requires_admin_hint:
            parts.append(f"(Hint) {cmd.requires_admin_hint}\n")
        parts.append(f"[exit code: {proc.returncode}]\n")
        if out:
            parts.append("\n--- stdout ---\n")
            parts.append(out)
            parts.append("\n")
        if err:
            parts.append("\n--- stderr ---\n")
            parts.append(err)
            parts.append("\n")
        if not out and not err:
            parts.append("(no output)\n")
        return "".join(parts)
    except FileNotFoundError:
        return (
            f"\n===== {cmd.title} =====\n"
            f"$ {' '.join(cmd.argv)}\n"
            f"[skipped] Command not found: {cmd.argv[0]}\n"
        )


def commands_for_system() -> list[Cmd]:
    system = platform.system().lower()

    if system == "windows":
        # Prefer PowerShell commands; fall back to wmic where possible.
        ps = shutil.which("powershell") or shutil.which("pwsh")
        if not ps:
            return [Cmd("wmic diskdrive list brief", ["wmic", "diskdrive", "get", "model,serialnumber,size,status"])]
        return [
            Cmd(
                "List disks (Get-Disk)",
                [ps, "-NoProfile", "-Command", "Get-Disk | Format-Table -Auto"],
                "If you see limited info, re-run the VS Code terminal as Administrator.",
            ),
            Cmd(
                "Physical disk health (Get-PhysicalDisk)",
                [ps, "-NoProfile", "-Command", "Get-PhysicalDisk | Select FriendlyName,HealthStatus,OperationalStatus,Size | Format-Table -Auto"],
                "If empty, your storage controller may not expose this; still try chkdsk /scan on the volume.",
            ),
            Cmd(
                "USB devices (PnP)",
                [ps, "-NoProfile", "-Command", "Get-PnpDevice -PresentOnly | Where-Object {$_.InstanceId -like 'USB*'} | Select Status,Class,FriendlyName,InstanceId | Format-Table -Auto"],
            ),
            Cmd(
                "WMIC diskdrive (fallback)",
                ["wmic", "diskdrive", "get", "model,serialnumber,size,status"],
            ),
        ]

    if system == "darwin":
        return [
            Cmd("diskutil list", ["diskutil", "list"]),
            Cmd("diskutil info (example: /dev/disk2)", ["bash", "-lc", "echo 'Run: diskutil info /dev/diskN (replace N from diskutil list)'"]),
            Cmd("Verify all disks (non-destructive)", ["bash", "-lc", "echo 'Run: diskutil verifyDisk /dev/diskN'"]),
            Cmd("Verify a volume (non-destructive)", ["bash", "-lc", "echo 'Run: diskutil verifyVolume /dev/diskNsM'"]),
        ]

    # Linux / other unix
    cmds: list[Cmd] = [
        Cmd(
            "List block devices (lsblk)",
            ["lsblk", "-o", "NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT,MODEL,SERIAL"],
            "If you see missing SERIAL/MODEL, run as root: sudo lsblk ...",
        ),
        Cmd("Identify filesystems (blkid)", ["bash", "-lc", "blkid || true"]),
        Cmd("Recent kernel messages (dmesg tail)", ["bash", "-lc", "dmesg | tail -n 120 || true"]),
    ]

    smartctl = shutil.which("smartctl")
    if smartctl:
        cmds.append(
            Cmd(
                "SMART scan (smartctl --scan)",
                ["bash", "-lc", "smartctl --scan || true"],
                "You may need sudo to access SMART: sudo smartctl -a /dev/sdX",
            )
        )
        cmds.append(
            Cmd(
                "SMART hint",
                ["bash", "-lc", "echo 'To read SMART for a drive: sudo smartctl -a /dev/sdX (replace X)'\n"],
            )
        )
    else:
        cmds.append(Cmd("SMART not available", ["bash", "-lc", "echo 'smartctl not found. Install smartmontools to read SMART.'"]))

    cmds.append(Cmd("fsck read-only hint", ["bash", "-lc", "echo 'Read-only fsck (safe): sudo fsck -n /dev/sdXN (replace)'\n"]))
    return cmds


def write_report(sections: Iterable[str]) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path.cwd() / "device_diagnostics"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / f"report_{ts}.txt"

    header = [
        "Device Diagnostics Report\n",
        f"Timestamp: {datetime.now().isoformat()}\n",
        f"OS: {platform.platform()}\n",
        "\n",
    ]
    report_path.write_text("".join(header) + "\n".join(sections), encoding="utf-8")
    return report_path


def main() -> None:
    cmds = commands_for_system()
    sections = [run_cmd(c) for c in cmds]
    report = write_report(sections)

    print("\nDone.")
    print(f"Saved report to: {report}")
    print("\nNext steps:")
    sysname = platform.system().lower()
    if sysname == "windows":
        print("- Identify the external drive letter, then run: chkdsk X: /scan")
    elif sysname == "darwin":
        print("- From 'diskutil list', pick diskN, then run: diskutil verifyDisk /dev/diskN")
    else:
        print("- From 'lsblk', identify /dev/sdX, then (optional): sudo smartctl -a /dev/sdX")
        print("- If filesystem issues suspected (read-only): sudo fsck -n /dev/sdXN")


if __name__ == "__main__":
    main()