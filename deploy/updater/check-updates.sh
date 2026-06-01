#!/usr/bin/env bash
# Comprueba si hay versión nueva en el remoto SIN aplicarla. Corre en el host,
# disparado por systemd (check-updates.path) cuando la app crea control/check.request.json.
# Hace git fetch, compara SHAs y escribe control/remote.json. La app lo lee con
# /api/admin/sistema/version.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
CONTROL="$APP_DIR/control"

cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
mkdir -p "$CONTROL"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
LOCAL="$(git rev-parse HEAD)"
ERR=""

if git fetch --quiet origin "$BRANCH" 2>/dev/null; then
  REMOTE="$(git rev-parse "origin/$BRANCH")"
else
  REMOTE="$LOCAL"
  ERR="No se pudo conectar con GitHub"
fi

AVAIL=false
[ "$LOCAL" != "$REMOTE" ] && AVAIL=true
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

tmp="$CONTROL/remote.json.tmp"
cat > "$tmp" <<EOF
{"branch":"$BRANCH","localSha":"$LOCAL","remoteSha":"$REMOTE","updateAvailable":$AVAIL,"checkedAt":"$NOW","error":"$ERR"}
EOF
mv "$tmp" "$CONTROL/remote.json"
rm -f "$CONTROL/check.request.json"
