# v1.0.0 Upload Checklist

## 1. Upload These 6 Files to Same Directory

Upload to: `https://rinawarptech.com/downloads/v1.0.0/`

- [ ] `rinawarp-terminal-pro_1.0.0_x86_64.AppImage`
- [ ] `rinawarp-terminal-pro_1.0.0_amd64.deb`
- [ ] `rinawarp-terminal-pro_1.0.0_windows.exe`
- [ ] `SHASUMS256.txt`
- [ ] `SHASUMS256.txt.asc`
- [ ] `RINAWARP_GPG_PUBLIC_KEY.asc`

## 2. Verify Download Page Links

Ensure `rinawarptech-website/web/download/index.html` links match exact filenames (case + underscores):

```html
<!-- Should link to: -->
<a href="/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_x86_64.AppImage">AppImage</a>
<a href="/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_amd64.deb">.deb</a>
<a href="/downloads/v1.0.0/SHASUMS256.txt">SHASUMS256.txt</a>
<a href="/downloads/v1.0.0/SHASUMS256.txt.asc">signature</a>
<a href="/downloads/v1.0.0/RINAWARP_GPG_PUBLIC_KEY.asc">public key</a>
```

## 3. Check Server Headers (after upload)

```bash
curl -I "https://rinawarptech.com/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_x86_64.AppImage"
curl -I "https://rinawarptech.com/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_amd64.deb"
```

Expected headers:
- `Content-Type: application/octet-stream`
- No automatic compression/transformations

## 4. Hosted File Verification (on fresh machine)

```bash
mkdir -p /tmp/rinawarp-verify && cd /tmp/rinawarp-verify

# Download all files
curl -LO "https://rinawarptech.com/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_x86_64.AppImage"
curl -LO "https://rinawarptech.com/downloads/v1.0.0/rinawarp-terminal-pro_1.0.0_amd64.deb"
curl -LO "https://rinawarptech.com/downloads/v1.0.0/SHASUMS256.txt"
curl -LO "https://rinawarptech.com/downloads/v1.0.0/SHASUMS256.txt.asc"
curl -LO "https://rinawarptech.com/downloads/v1.0.0/RINAWARP_GPG_PUBLIC_KEY.asc"

# Verify
gpg --import RINAWARP_GPG_PUBLIC_KEY.asc
gpg --verify SHASUMS256.txt.asc SHASUMS256.txt
sha256sum -c SHASUMS256.txt
```

Expected output:
- `gpg: Good signature from "RinaWarp Team <team@rinawarptech.com>"`
- `rinawarp-terminal-pro_1.0.0_x86_64.AppImage: OK`
- `rinawarp-terminal-pro_1.0.0_amd64.deb: OK`

## 5. App Smoke Test

### AppImage
```bash
chmod +x rinawarp-terminal-pro_1.0.0_x86_64.AppImage
./rinawarp-terminal-pro_1.0.0_x86_64.AppImage
```

### .deb
```bash
sudo dpkg -i rinawarp-terminal-pro_1.0.0_amd64.deb
rinawarp-terminal-pro
```

### .exe (Windows)
```bash
# Download and run the installer
# SmartScreen may warn - click "More info" → "Run anyway"
```

### In-App Verification
- [ ] About shows v1.0.0
- [ ] Workspace picker opens native dialog
- [ ] Agent/Terminal toggle works
- [ ] ⌘K palette works
- [ ] Terminal mode: `pwd` executes
- [ ] Download report produces JSON
- [ ] Stop plan shows soft-cancel assistant block
