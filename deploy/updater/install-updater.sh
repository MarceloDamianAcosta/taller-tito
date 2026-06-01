#!/usr/bin/env bash
# Instala el agente de auto-actualización (systemd) en el host. Idempotente:
# se puede correr varias veces. Lo llama deploy/instalar.sh en el setup inicial,
# o se corre a mano: sudo bash deploy/updater/install-updater.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
HERE="$(cd "$(dirname "$0")" && pwd)"

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

# curl es necesario para el health-check del pipeline
if ! command -v curl >/dev/null 2>&1; then
  echo "→ Instalando curl..."
  if command -v apk >/dev/null 2>&1; then $SUDO apk add --no-cache curl
  elif command -v apt-get >/dev/null 2>&1; then $SUDO apt-get update -qq && $SUDO apt-get install -y curl
  elif command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y curl
  else echo "⚠ No pude instalar curl automáticamente; instalalo a mano."; fi
fi

chmod +x "$HERE"/taller-updater.sh "$HERE"/check-updates.sh
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
mkdir -p "$APP_DIR/control" "$APP_DIR/backups"

echo "→ Instalando units de systemd..."
for unit in taller-updater check-updates; do
  $SUDO cp "$HERE/$unit.service" /etc/systemd/system/
  $SUDO cp "$HERE/$unit.path" /etc/systemd/system/
done

$SUDO systemctl daemon-reload
$SUDO systemctl enable --now taller-updater.path check-updates.path

echo "✓ Agente de auto-actualización instalado y activo."
echo "  Logs:   journalctl -u taller-updater.service -f"
echo "  Estado: systemctl status taller-updater.path"
