# RinaWarp Terminal Pro v1.0.0 Release Verification

## Files in this release

| File | Description |
|------|-------------|
| `rinawarp-terminal-pro_1.0.0_x86_64.AppImage` | Linux AppImage installer (104 MB) |
| `rinawarp-terminal-pro_1.0.0_amd64.deb` | Debian/Ubuntu .deb package (73 MB) |
| `SHASUMS256.txt` | SHA256 checksums for all files |
| `SHASUMS256.txt.asc` | GPG signature of checksums |
| `RINAWARP_GPG_PUBLIC_KEY.asc` | RinaWarp Team public key |

## GPG Key Information

| | |
|---|---|
| **Key ID** | `0x9655B53A0B3E6FA4` |
| **Fingerprint** | `BFC6 4346 F392 57B4 9A37 DBA6 9655 B53A 0B3E 6FA4` |
| **Email** | `team@rinawarptech.com` |
| **Expires** | 2027-02-04 |

## Verify downloads (Linux/macOS)

```bash
# 1. Import the RinaWarp public key
gpg --import RINAWARP_GPG_PUBLIC_KEY.asc

# 2. Verify the checksum signature
gpg --verify SHASUMS256.txt.asc SHASUMS256.txt

# 3. Verify your downloaded file matches
sha256sum -c SHASUMS256.txt
```

Expected output for a valid download:
```
rinawarp-terminal-pro_1.0.0_x86_64.AppImage: OK
rinawarp-terminal-pro_1.0.0_amd64.deb: OK
```

## Verify the key fingerprint (out-of-band)

To confirm this key is legitimate, cross-reference this fingerprint with:
- This page on rinawarptech.com/download
- Official RinaWarp documentation

## Security note

Always verify the checksum signature before running any downloaded installer.
This ensures:
1. The files have not been tampered with
2. The files were actually released by RinaWarp Team
