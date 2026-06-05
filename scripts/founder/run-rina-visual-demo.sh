#!/usr/bin/env bash
set -euo pipefail

REPO="/home/karina/rinawarp-terminal-pro"
PROJECT="/home/karina/rina-test-project"
OUT_DIR="$REPO/demo-recordings"
STAMP="$(date +%Y%m%d-%H%M%S)"
VIDEO="$OUT_DIR/rina-founder-visual-demo-$STAMP.mp4"

APPIMAGE_RELEASE="$REPO/release-artifacts/v1.8.2-beta/RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage"
APPIMAGE_BUILT="$REPO/apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage"

cd "$REPO"

echo "== RinaWarp Founder Visual Demo =="
echo "Repo: $REPO"
echo "Project: $PROJECT"
echo ""

npm run founder:check-repo

echo ""
echo "Git status:"
git status --short

mkdir -p "$OUT_DIR"

if [ ! -d "$PROJECT" ]; then
  echo ""
  echo "Creating safe broken test project at $PROJECT"
  mkdir -p "$PROJECT/src"
  cd "$PROJECT"
  npm init -y >/dev/null
  npm pkg set scripts.build="tsc" >/dev/null
  npm pkg set scripts.test="node test.js" >/dev/null
  npm install --save-dev typescript >/dev/null

  cat > tsconfig.json <<'PROJECT_EOF'
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist"
  },
  "include": ["src"]
}
PROJECT_EOF

  cat > src/index.ts <<'PROJECT_EOF'
export function add(a: number, b: number): number {
  return a + b
}

const result: string = add(1, 2)
console.log(result)
PROJECT_EOF

  cat > test.js <<'PROJECT_EOF'
const { add } = require('./dist/index.js')

if (add(1, 2) !== 3) {
  throw new Error('add failed')
}

console.log('tests passed')
PROJECT_EOF

  cd "$REPO"
fi

if [ -f "$APPIMAGE_BUILT" ]; then
  APP="$APPIMAGE_BUILT"
else
  APP="$APPIMAGE_RELEASE"
fi

if [ ! -f "$APP" ]; then
  echo "ERROR: AppImage not found."
  echo "Checked:"
  echo "  $APPIMAGE_BUILT"
  echo "  $APPIMAGE_RELEASE"
  exit 1
fi

chmod +x "$APP"

echo ""
echo "Using app:"
echo "$APP"

echo ""
echo "Founder test prompts:"
cat <<'PROMPTS'
1. Choose project:
   /home/karina/rina-test-project

2. Ask:
   Hi Rina, what can you help me do in this project?

3. Ask:
   Inspect this project and tell me what kind of project it is. Do not change files.

4. Ask:
   Build this project and tell me what fails.

5. Ask:
   Plan a safe fix. Do not edit files until I approve.

6. Ask:
   Approve the safe fix.

7. Ask:
   Export the proof from this run.
PROMPTS

echo ""
echo "Starting screen recording:"
echo "$VIDEO"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg is not installed."
  echo "Install with: sudo apt install -y ffmpeg"
  exit 1
fi

DISPLAY_TO_RECORD="${DISPLAY:-:0.0}"

echo "Recording DISPLAY=$DISPLAY_TO_RECORD"
echo "Press ENTER after you finish the Rina loop to stop recording."
echo ""

ffmpeg \
  -y \
  -video_size 1280x720 \
  -framerate 30 \
  -f x11grab \
  -i "$DISPLAY_TO_RECORD" \
  -codec:v libx264 \
  -pix_fmt yuv420p \
  -preset veryfast \
  -movflags +faststart \
  "$VIDEO" \
  >/tmp/rina-demo-ffmpeg.log 2>&1 &

FFMPEG_PID=$!

sleep 2

echo "Launching RinaWarp Terminal Pro..."
"$APP" &
APP_PID=$!

echo ""
echo "App PID: $APP_PID"
echo "Recording PID: $FFMPEG_PID"
echo ""
echo "Complete the manual test in the app now."
echo "When finished, return here and press ENTER."
read -r _

echo "Stopping recording..."
kill -INT "$FFMPEG_PID" 2>/dev/null || true
sleep 2

echo "Stopping app..."
kill "$APP_PID" 2>/dev/null || true

echo ""
echo "Demo video saved:"
echo "$VIDEO"

echo ""
echo "Review checklist:"
cat <<'CHECKLIST'
App opens:
Composer visible:
Can type:
Enter/Send works:
Rina replies:
Project selected:
Rina inspects project:
Rina runs command/tool:
Output streams:
Proof appears:
Proof exports:
Restart persistence works:
CHECKLIST
