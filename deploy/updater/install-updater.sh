#!/usr/bin/env bash
# Instala el agente de auto-actualización (systemd). Idempotente.
# Detecta el modo automáticamente:
#   - Como root (PC del taller, Docker del sistema) → units de SISTEMA en /etc/systemd/system.
#   - Sin root (PC de dev con Docker Desktop, socket por-usuario) → units de USUARIO
#     (systemctl --user), que corren como vos y sí pueden usar tu Docker.
# Lo llama deploy/instalar.sh (con sudo → modo root) o se corre a mano sin sudo en dev.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
HERE="$(cd "$(dirname "$0")" && pwd)"

ensure_curl() {
  local SUDO="$1"
  command -v curl >/dev/null 2>&1 && return
  echo "→ Instalando curl..."
  if command -v apk >/dev/null 2>&1; then $SUDO apk add --no-cache curl
  elif command -v apt-get >/dev/null 2>&1; then $SUDO apt-get update -qq && $SUDO apt-get install -y curl
  elif command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y curl
  else echo "⚠ No pude instalar curl automáticamente; instalalo a mano."; fi
}

chmod +x "$HERE"/taller-updater.sh "$HERE"/check-updates.sh
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
mkdir -p "$APP_DIR/control" "$APP_DIR/backups"

# Como root, los services de systemd corren como root sobre un repo que suele ser de otro
# usuario (ej. tito) → git aborta por "dubious ownership". --system (/etc/gitconfig) lo
# resuelve para cualquier usuario. Y dejamos control/ y backups/ con el dueño del repo para
# que tanto el pipeline (root) como un run manual del dueño puedan escribir el backup.
if [ "$(id -u)" -eq 0 ]; then
  git config --system --add safe.directory "$APP_DIR" 2>/dev/null || true
  OWNER="$(stat -c %U "$APP_DIR" 2>/dev/null || echo root)"
  chown "$OWNER":"$OWNER" "$APP_DIR/control" "$APP_DIR/backups" 2>/dev/null || true
fi

if [ "$(id -u)" -eq 0 ]; then
  # ── Modo SISTEMA (producción / Docker del sistema) ──────────────────────────
  ensure_curl ""
  echo "→ Instalando units de sistema..."
  for unit in taller-updater check-updates; do
    cp "$HERE/$unit.service" /etc/systemd/system/
    cp "$HERE/$unit.path" /etc/systemd/system/
  done
  systemctl daemon-reload
  systemctl enable --now taller-updater.path check-updates.path
  echo "✓ Agente (sistema) instalado y activo."
  echo "  Logs:   journalctl -u taller-updater.service -f"
  echo "  Estado: systemctl status taller-updater.path"
else
  # ── Modo USUARIO (dev / Docker Desktop, socket por-usuario) ─────────────────
  ensure_curl "sudo"
  UNIT_DIR="$HOME/.config/systemd/user"
  mkdir -p "$UNIT_DIR"

  cat > "$UNIT_DIR/taller-updater.service" <<EOF
[Unit]
Description=Auto-update de la app del taller (user / Docker Desktop)

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=$HERE/taller-updater.sh
TimeoutStartSec=1800
EOF

  cat > "$UNIT_DIR/taller-updater.path" <<EOF
[Unit]
Description=Vigila pedidos de actualización (user)

[Path]
PathExists=$APP_DIR/control/update.request.json
Unit=taller-updater.service

[Install]
WantedBy=default.target
EOF

  cat > "$UNIT_DIR/check-updates.service" <<EOF
[Unit]
Description=Check de actualizaciones de la app del taller (user)

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=$HERE/check-updates.sh
TimeoutStartSec=120
EOF

  cat > "$UNIT_DIR/check-updates.path" <<EOF
[Unit]
Description=Vigila pedidos de "buscar actualizaciones" (user)

[Path]
PathExists=$APP_DIR/control/check.request.json
Unit=check-updates.service

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now taller-updater.path check-updates.path
  echo "✓ Agente (usuario) instalado y activo."
  echo "  Logs:   journalctl --user -u taller-updater.service -f"
  echo "  Estado: systemctl --user status taller-updater.path"
fi
