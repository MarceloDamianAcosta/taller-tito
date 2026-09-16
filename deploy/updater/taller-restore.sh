#!/usr/bin/env bash
# Restore pedido desde /admin/sistema, corre en el HOST (no en el contenedor).
# Lo dispara systemd (taller-restore.path) cuando la app crea control/restore.request.json,
# después de subir el backup con POST .../restore-upload (queda en restore-uploads/pending.db).
# PISA la base de datos y los archivos actuales sin vuelta atrás con un click —
# por eso arranca con un backup automático del estado previo (queda en backups/,
# se puede usar para deshacerlo con el mismo mecanismo de restore).
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
CONTROL="$APP_DIR/control"
LOCK="$CONTROL/restore.lock"
REQ="$CONTROL/restore.request.json"
LOG="$CONTROL/restore.log"
PENDING_DB="$APP_DIR/restore-uploads/pending.db"
PENDING_UPLOADS="$APP_DIR/restore-uploads/pending-uploads.tar.gz"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

cd "$APP_DIR"
mkdir -p "$CONTROL" backups

P_ENV="$(grep -E '^P=' .env 2>/dev/null | tail -1 | cut -d= -f2-)"
HEALTH_URL="http://localhost:${P_ENV:-3000}/api/health"
STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED=""
BACKUP_NAME=""

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG" >&2; }

write_status() {
  local phase="$1" message="${2:-}" result="${3:-}"
  message="$(printf '%s' "$message" | tr -d '"\\' | tr '\n\r' '  ')"
  cat > "$CONTROL/restore-status.json" <<EOF
{"phase":"$phase","result":"$result","preRestoreBackup":"$BACKUP_NAME","startedAt":"$STARTED","finishedAt":"$FINISHED","message":"$message"}
EOF
}

finish() { FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; write_status "$1" "$2" "$1"; rm -f "$REQ"; }

wait_for_health() {
  local n=0
  while [ "$n" -lt "$HEALTH_TIMEOUT" ]; do
    curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && return 0
    sleep 2; n=$((n + 2))
  done
  return 1
}

# ── Candado: un solo restore a la vez ───────────────────────────────────────
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Otro restore en curso, salgo."
  exit 0
fi

[ -f "$REQ" ] || { log "Sin request, nada que hacer."; exit 0; }

: > "$LOG"

if [ ! -f "$PENDING_DB" ]; then
  log "No hay backup subido en restore-uploads/pending.db"
  finish failed "No hay ningún backup subido para restaurar."
  exit 0
fi

log "Restore solicitado, fuente: $PENDING_DB"

# ── Backup del estado actual antes de pisarlo ───────────────────────────────
write_status backing_up "Respaldando el estado actual antes de restaurar..."
BACKUP_NAME="pre-restauracion-$(date +%d-%m-%y_%H-%M)"
yes y | ./deploy/db-backup.sh "$BACKUP_NAME" >>"$LOG" 2>&1 || log "Aviso: el backup previo no se pudo completar (sigo igual, el restore no depende de él)"

# ── Restore ──────────────────────────────────────────────────────────────────
write_status restoring "Restaurando la base de datos y los archivos subidos..."
if ! yes y | ./deploy/db-restore.sh "$PENDING_DB" >>"$LOG" 2>&1; then
  log "Falló el restore"
  finish failed "Falló el restore. El backup de antes de tocar nada quedó en backups/${BACKUP_NAME}.db."
  exit 0
fi

# Se aplicó: no dejamos el .db subido pesando en el disco ni disparable de nuevo por error.
rm -f "$PENDING_DB" "$PENDING_UPLOADS"

write_status health_check "Verificando que la app respondió..."
if wait_for_health; then
  log "Restore OK"
  finish done "Restore completado. Si algo no está bien, el estado de antes quedó en backups/${BACKUP_NAME}.db."
else
  finish failed "El restore se aplicó pero la app no respondió después. Revisar el servidor manualmente."
fi
exit 0
