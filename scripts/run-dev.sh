#!/bin/zsh
# Lancé par launchd (voir ~/Library/LaunchAgents/com.aida.robes-dz-radar.dashboard.plist).
# KeepAlive=true : launchd relance automatiquement le serveur s'il meurt.
# Port 3100 (pas 3000) : le dashboard de ~/ai-opportunity-engine tourne déjà
# en permanence sur 3000 via son propre agent launchd.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "/Users/aida/robes-dz-radar"
exec npm run dev -- -p 3100
