#!/bin/bash
# ~/dev/rinawarp/launch_rinawarp.sh
# Fully automated canonical environment launcher

# Source environment
source ~/dev/rinawarp/.env

# Open canonical workspace in VS Code
code -r $RINAWARP_ROOT &

# Launch terminals for each subsystem
declare -a PATHS=($VSCODE $TERMINAL $AI_MV $API $BILLING $LICENSING $CLOUDFLARE $GITHUB $NGINX)

for p in "${PATHS[@]}"; do
    if [ -d "$p" ]; then
        gnome-terminal -- bash -c "cd $p && exec bash" &
    fi
done

echo "✅ RinaWarp canonical environment launched successfully."
