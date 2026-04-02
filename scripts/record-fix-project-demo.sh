#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OBS_HOME="$ROOT_DIR/output/obs-demo-home"
OBS_CONFIG_HOME="$OBS_HOME/.config"
OBS_DIR="$OBS_CONFIG_HOME/obs-studio"
OBS_PROFILE_DIR="$OBS_DIR/basic/profiles/Untitled"
OBS_SCENES_DIR="$OBS_DIR/basic/scenes"
OBS_WS_DIR="$OBS_DIR/plugin_config/obs-websocket"
ARTIFACT_DIR="$ROOT_DIR/docs/assets"
OBS_LOG="$ROOT_DIR/output/obs-demo.log"
OBS_WS_PORT="4466"

mkdir -p "$OBS_PROFILE_DIR" "$OBS_SCENES_DIR" "$OBS_WS_DIR" "$ARTIFACT_DIR" "$ROOT_DIR/output"

cat >"$OBS_WS_DIR/config.json" <<'EOF'
{
  "alerts_enabled": false,
  "auth_required": false,
  "first_load": false,
  "server_enabled": true,
  "server_password": "",
  "server_port": 4466
}
EOF

cat >"$OBS_PROFILE_DIR/basic.ini" <<EOF
[General]
Name=Untitled
[Output]
Mode=Simple
[SimpleOutput]
FilePath=$ARTIFACT_DIR
RecFormat2=mkv
VBitrate=4500
ABitrate=160
RecQuality=Small
RecEncoder=obs_x264
EOF

export HOME="$OBS_HOME"
export XDG_CONFIG_HOME="$OBS_CONFIG_HOME"
export DISPLAY="${DISPLAY:-:0.0}"

obs --multi --minimize-to-tray --disable-missing-files-check >"$OBS_LOG" 2>&1 &
OBS_PID=$!

cleanup() {
  if ps -p "$OBS_PID" >/dev/null 2>&1; then
    kill "$OBS_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

python3 "$ROOT_DIR/scripts/obs_websocket.py" wait-ready --port "$OBS_WS_PORT" --timeout 30
python3 "$ROOT_DIR/scripts/obs_websocket.py" ensure-demo-scene --port "$OBS_WS_PORT"
python3 "$ROOT_DIR/scripts/obs_websocket.py" start-record --port "$OBS_WS_PORT"

node --import "$ROOT_DIR/apps/terminal-pro/node_modules/tsx/dist/loader.mjs" \
  "$ROOT_DIR/apps/terminal-pro/scripts/record-fix-project-demo.ts"

sleep 1
OUTPUT_PATH="$(python3 "$ROOT_DIR/scripts/obs_websocket.py" stop-record --port "$OBS_WS_PORT" | tail -n 1)"

if [[ -n "$OUTPUT_PATH" && -f "$OUTPUT_PATH" ]]; then
  ffmpeg -y -i "$OUTPUT_PATH" -c copy "$ARTIFACT_DIR/rinawarp-fix-project-demo-obs.mp4" >/dev/null 2>&1
  echo "Saved demo recording to $ARTIFACT_DIR/rinawarp-fix-project-demo-obs.mp4"
else
  echo "OBS stopped, but no output path was returned." >&2
  exit 1
fi
