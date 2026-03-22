#!/bin/bash
#
# RinaWarp Terminal Pro Installer
# https://rinawarptech.com
#
# Usage:
#   curl -fsSL https://rinawarptech.com/install | bash
#

set -e

MANIFEST_URL="https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev/latest.json"
INSTALL_DIR="${HOME}/.rinawarp"
BIN_DIR="${INSTALL_DIR}/bin"

VERSION="$(curl -fsSL "$MANIFEST_URL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')"

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)
        case "$ARCH" in
            x86_64)
                FILENAME="RinaWarp-Terminal-Pro-${VERSION}.AppImage"
                ;;
            aarch64|arm64)
                FILENAME="RinaWarp-Terminal-Pro-${VERSION}-arm64.AppImage"
                ;;
            *)
                echo "Unsupported architecture: $ARCH"
                exit 1
                ;;
        esac
        ;;
    Darwin*)
        case "$ARCH" in
            x86_64)
                FILENAME="RinaWarp-Terminal-Pro-${VERSION}.dmg"
                ;;
            arm64)
                FILENAME="RinaWarp-Terminal-Pro-${VERSION}-arm64.dmg"
                ;;
        esac
        ;;
    MINGW*|MSYS*|CYGWIN*)
        FILENAME="RinaWarp-Terminal-Pro-${VERSION}.exe"
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

echo "Installing RinaWarp Terminal Pro v${VERSION}..."

# Create install directory
mkdir -p "${BIN_DIR}"

# Download the binary from the public installers origin
DOWNLOAD_URL="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev/releases/${VERSION}/${FILENAME}"
echo "Downloading from ${DOWNLOAD_URL}..."

curl -fsSL "${DOWNLOAD_URL}" -o "${BIN_DIR}/${FILENAME}"

# Make it executable
chmod +x "${BIN_DIR}/${FILENAME}"

# Add to PATH
SHELL_RC="${HOME}/.bashrc"
if [ -f "${HOME}/.zshrc" ]; then
    SHELL_RC="${HOME}/.zshrc"
fi

# Check if already in PATH
if ! grep -q "rinawarp" "${SHELL_RC}" 2>/dev/null; then
    echo "" >> "${SHELL_RC}"
    echo "# RinaWarp Terminal Pro" >> "${SHELL_RC}"
    echo "export PATH=\"\${HOME}/.rinawarp/bin:\${PATH}\"" >> "${SHELL_RC}"
    echo "Added RinaWarp to your PATH. Please run: source ${SHELL_RC}"
fi

echo ""
echo "✅ RinaWarp Terminal Pro v${VERSION} installed successfully!"
echo ""
echo "To get started:"
echo "  1. Source your shell config: source ~/.bashrc (or ~/.zshrc)"
echo "  2. Run: rinawarp"
echo ""
echo "For more info: https://rinawarptech.com"
