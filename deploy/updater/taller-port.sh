#!/usr/bin/env bash
# Cambio de puerto pedido desde /admin/sistema, corre en el HOST (no en el contenedor).
# Lo dispara systemd (taller-port.path) cuando la app crea control/port.request.json.
# El puerto se fija al crear el contenedor (docker-compose.yml: "${P:-3000}:3000"),
# no se puede remapear uno corriendo → hay que reescribir .env y recrear `prod`.
# Si el puerto nuevo no responde, rollback solo a .env con el puerto anterior.
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
CONTROL="$APP_DIR/control"
LOCK="$CONTROL/port.lock"
REQ="$CONTROL/port.request.json"
LOG="$CONTROL/port.log"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

cd "$APP_DIR"
mkdir -p "$CONTROL"

OLD_PORT="$(grep -E '^P=' .env 2>/dev/null | tail -1 | cut -d= -f2-)"
OLD_PORT="${OLD_PORT:-3000}"
STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED=""
NEW_PORT=""

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG" >&2; }

write_status() {
  local phase="$1" message="${2:-}" result="${3:-}"
  message="$(printf '%s' "$message" | tr -d '"\\' | tr '\n\r' '  ')"
  cat > "$CONTROL/port-status.json" <<EOF
{"phase":"$phase","result":"$result","oldPort":${OLD_PORT},"targetPort":${NEW_PORT:-null},"startedAt":"$STARTED","finishedAt":"$FINISHED","message":"$message"}
EOF
}

finish() { FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; write_status "$1" "$2" "$1"; rm -f "$REQ"; }

set_port_env() {
  local port="$1"
  if grep -qE '^P=' .env 2>/dev/null; then
    sed -i "s/^P=.*/P=${port}/" .env
  else
    echo "P=${port}" >> .env
  fi
}

# Fedora trae firewalld; si no está activo esto no hace nada (Debian sin ufw no rompe).
open_firewall_port() {
  local port="$1"
  if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld 2>/dev/null; then
    firewall-cmd --permanent --add-port="${port}/tcp" >>"$LOG" 2>&1 || true
    firewall-cmd --reload >>"$LOG" 2>&1 || true
  fi
}

wait_for_health() {
  local port="$1" n=0
  while [ "$n" -lt "$HEALTH_TIMEOUT" ]; do
    curl -fsS "http://localhost:${port}/api/health" >/dev/null 2>&1 && return 0
    sleep 2; n=$((n + 2))
  done
  return 1
}

# ── Candado: un solo cambio de puerto a la vez ──────────────────────────────
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Otro cambio de puerto en curso, salgo."
  exit 0
fi

[ -f "$REQ" ] || { log "Sin request, nada que hacer."; exit 0; }

: > "$LOG"
NEW_PORT="$(grep -o '"port":[0-9]*' "$REQ" | head -1 | grep -o '[0-9]*$')"
if [ -z "$NEW_PORT" ]; then
  log "Request sin puerto válido"
  finish failed "Pedido de cambio de puerto inválido."
  exit 0
fi
if [ "$NEW_PORT" = "$OLD_PORT" ]; then
  log "Ya estaba en $OLD_PORT, nada que hacer"
  finish done "Ya estaba usando el puerto ${OLD_PORT}."
  exit 0
fi

log "Cambiando puerto $OLD_PORT → $NEW_PORT"
write_status applying "Aplicando el puerto nuevo..."
set_port_env "$NEW_PORT"
open_firewall_port "$NEW_PORT"

if ! docker compose up -d prod >>"$LOG" 2>&1; then
  log "Falló al recrear el contenedor, revirtiendo a $OLD_PORT"
  set_port_env "$OLD_PORT"
  docker compose up -d prod >>"$LOG" 2>&1 || true
  finish failed "No se pudo aplicar el puerto nuevo; se mantuvo ${OLD_PORT}."
  exit 0
fi

write_status health_check "Verificando que respondió en el puerto nuevo..."
if wait_for_health "$NEW_PORT"; then
  log "Puerto nuevo OK: $NEW_PORT"
  finish done "Puerto cambiado a ${NEW_PORT}."
  exit 0
fi

log "El puerto nuevo no respondió, revirtiendo a $OLD_PORT"
write_status restarting "No respondió en el puerto nuevo; restaurando el anterior..."
set_port_env "$OLD_PORT"
docker compose up -d prod >>"$LOG" 2>&1 || true

if wait_for_health "$OLD_PORT"; then
  NEW_PORT="$OLD_PORT"
  finish rolled_back "El puerto nuevo no respondió; se mantuvo ${OLD_PORT}."
else
  finish failed "Falló el cambio de puerto y no se pudo confirmar el puerto anterior. Revisar el servidor manualmente."
fi
exit 0
