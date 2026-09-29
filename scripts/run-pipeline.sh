#!/bin/zsh
# Lancé par launchd (voir ~/Library/LaunchAgents/com.aida.robes-dz-radar.pipeline.plist).
# Pas de "set -e" (déviation délibérée vs. ai-opportunity-engine) : un échec du
# pipeline de demande ne doit pas empêcher le pipeline marché indépendant de
# tourner la même nuit — voir plan §6.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "/Users/aida/robes-dz-radar"
echo "===== $(date '+%Y-%m-%d %H:%M:%S') ====="
npm run pipeline || echo "[pipeline] échec pipeline demande, on continue vers le marché"
npm run market   || echo "[pipeline] échec pipeline marché"
