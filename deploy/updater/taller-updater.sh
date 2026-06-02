#!/usr/bin/env bash
# Pipeline de auto-actualización, corre en el HOST (no en el contenedor).
# Lo dispara systemd (taller-updater.path) cuando la app crea control/update.request.json.
# Flujo: backup DB → git pull → docker compose build/up → health-check → rollback si falla.
# Branch-agnostic: en el taller pullea master, en staging B pullea develop.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taller/app}"
CONTROL="$APP_DIR/control"
LOCK="$CONTROL/update.lock"
REQ="$CONTROL/update.request.json"
LOG="$CONTROL/update.log"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

cd "$APP_DIR"
mkdir -p "$CONTROL" backups

# git se queja de "dubious ownership" si el repo es de otro usuario y corremos como root.
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

OLD_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
TARGET_SHA=""
STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED=""

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG" >&2; }

# Escribe status.json EN EL LUGAR (sin rename). Docker Desktop no propaga los
# renames host→contenedor, así que un `mv` deja a la app leyendo el status viejo.
# El archivo es chico (<4KB, una sola escritura) → lectura parcial es casi imposible
# y la app tolera un JSON inválido (lo trata como idle y reintenta). Sanitiza message.
write_status() {
  local phase="$1" message="${2:-}" result="${3:-}"
  message="$(printf '%s' "$message" | tr -d '"\\' | tr '\n\r' '  ')"
  cat > "$CONTROL/status.json" <<EOF
{"phase":"$phase","result":"$result","oldSha":"$OLD_SHA","targetSha":"$TARGET_SHA","startedAt":"$STARTED","finishedAt":"$FINISHED","message":"$message"}
EOF
}

finish() { FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; write_status "$1" "$2" "$1"; rm -f "$REQ"; }

# Falla en las fases previas al "apply" (fetch, etc): abortar sin tocar nada.
trap 'finish failed "El proceso de actualización abortó inesperadamente"; exit 1' ERR

wait_for_health() {
  local n=0
  while [ "$n" -lt "$HEALTH_TIMEOUT" ]; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep 2; n=$((n + 2))
  done
  return 1
}

# ── Candado: una sola actualización a la vez ────────────────────────────────
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Otra actualización en curso, salgo."
  exit 0
fi

[ -f "$REQ" ] || { log "Sin request, nada que hacer."; exit 0; }

: > "$LOG"
log "Update solicitado. SHA actual: $OLD_SHA"
write_status checking "Buscando cambios..."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin "$BRANCH"
TARGET_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$OLD_SHA" = "$TARGET_SHA" ]; then
  log "Sin cambios."
  finish up_to_date "Ya estás en la última versión."
  exit 0
fi
log "Nueva versión disponible: $TARGET_SHA"

# ── Backup de la DB antes de tocar nada ─────────────────────────────────────
write_status backing_up "Respaldando base de datos..."
BACKUP_NAME="pre-update-$(date +%Y%m%d-%H%M)"
yes y | ./deploy/db-backup.sh "$BACKUP_NAME" >>"$LOG" 2>&1 || log "Aviso: backup no se pudo completar (¿prod no estaba corriendo?)"

# ── Aplicar: a partir de acá los errores van a ROLLBACK, no a abort ──────────
trap - ERR
apply_failed=0

write_status pulling "Descargando la actualización..."
git reset --hard "origin/$BRANCH" >>"$LOG" 2>&1 || apply_failed=1

if [ "$apply_failed" -eq 0 ]; then
  write_status building "Compilando la nueva versión (puede tardar)..."
  GIT_SHA="$TARGET_SHA" BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    docker compose build prod >>"$LOG" 2>&1 || apply_failed=1
fi

if [ "$apply_failed" -eq 0 ]; then
  write_status restarting "Reiniciando la aplicación..."
  docker compose up -d prod >>"$LOG" 2>&1 || apply_failed=1
fi

if [ "$apply_failed" -eq 0 ]; then
  write_status health_check "Verificando que arrancó bien..."
  wait_for_health || apply_failed=1
fi

if [ "$apply_failed" -eq 0 ]; then
  log "Actualización OK → $TARGET_SHA"
  finish done "Actualización completada."
  exit 0
fi

# ── Rollback ────────────────────────────────────────────────────────────────
log "Falló la actualización. Rollback a $OLD_SHA"
write_status restarting "Falló la actualización. Restaurando la versión anterior..."
git reset --hard "$OLD_SHA" >>"$LOG" 2>&1 || true
GIT_SHA="$OLD_SHA" BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  docker compose build prod >>"$LOG" 2>&1 || true
docker compose up -d prod >>"$LOG" 2>&1 || true

if [ -f "backups/${BACKUP_NAME}.db" ]; then
  log "Restaurando DB desde backups/${BACKUP_NAME}.db"
  yes y | ./deploy/db-restore.sh "backups/${BACKUP_NAME}.db" >>"$LOG" 2>&1 || log "Aviso: restore de DB falló"
fi

if wait_for_health; then
  TARGET_SHA="$OLD_SHA"
  finish rolled_back "Falló la actualización; se restauró la versión anterior y los datos."
else
  finish failed "Falló la actualización y el rollback. Revisar el servidor manualmente."
fi
exit 0
