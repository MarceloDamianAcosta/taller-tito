#!/usr/bin/env bash
# Backup manual pedido desde /admin/sistema, corre en el HOST (no en el contenedor).
# Lo dispara systemd (taller-backup.path) cuando la app crea control/backup.request.json.
# db-backup.sh para `prod` un momento para que SQLite no esté escribiendo mientras
# se copia — por eso no se puede hacer desde adentro del propio contenedor.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
CONTROL="$APP_DIR/control"
LOCK="$CONTROL/backup.lock"
REQ="$CONTROL/backup.request.json"
LOG="$CONTROL/backup.log"

cd "$APP_DIR"
mkdir -p "$CONTROL" backups

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git config --system --add safe.directory "$APP_DIR" 2>/dev/null || true

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED=""
# Tito reconoce el backup por la fecha (dd-mm-aa), no por un timestamp críptico.
# La hora se agrega solo para no pisar un backup si hace dos el mismo día.
NAME="$(date +%d-%m-%y_%H-%M)"

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG" >&2; }

# Escribe status EN EL LUGAR (sin rename), igual que taller-updater.sh: Docker
# Desktop no propaga renames host→contenedor.
write_status() {
  local phase="$1" message="${2:-}" result="${3:-}"
  message="$(printf '%s' "$message" | tr -d '"\\' | tr '\n\r' '  ')"
  cat > "$CONTROL/backup-status.json" <<EOF
{"phase":"$phase","result":"$result","fileName":"$NAME","startedAt":"$STARTED","finishedAt":"$FINISHED","message":"$message"}
EOF
}

finish() { FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; write_status "$1" "$2" "$1"; rm -f "$REQ"; }

trap 'finish failed "El backup falló. Revisar control/backup.log en el host."' ERR

# ── Candado: un solo backup a la vez ────────────────────────────────────────
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Otro backup en curso, salgo."
  exit 0
fi

[ -f "$REQ" ] || { log "Sin request, nada que hacer."; exit 0; }

: > "$LOG"
log "Backup manual solicitado → $NAME"
write_status running "Respaldando base de datos y archivos..."

echo y | ./deploy/db-backup.sh "$NAME" >>"$LOG" 2>&1

log "Backup OK → backups/${NAME}.db"
finish done "Backup completado: ${NAME}.db"
