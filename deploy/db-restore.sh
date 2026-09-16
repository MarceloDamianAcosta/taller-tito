#!/bin/bash
# Restaura un backup en el volume prod-data.
# Uso: ./deploy/db-restore.sh <archivo.db>
set -e

cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
  echo "Uso: $0 <archivo.db>"
  echo "Backups disponibles:"
  ls -lh backups/*.db 2>/dev/null || echo "  (ninguno en backups/)"
  exit 1
fi

SRC="$1"
if [ ! -f "$SRC" ]; then
  echo "✗ No existe el archivo: $SRC"
  exit 1
fi

read -rp "✗ Esto va a sobrescribir la DB actual con '$SRC'. ¿Seguro? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) echo "Cancelado."; exit 1 ;;
esac

WAS_RUNNING=0
if docker compose ps prod --status running --quiet | grep -q .; then
  WAS_RUNNING=1
  echo "→ Deteniendo prod..."
  docker compose stop prod
fi

echo "→ Copiando $SRC al volume..."
docker compose cp "$SRC" prod:/app/data/taller.db

# Si el backup vino con WAL al lado (checkpoint fallido al respaldar), hay que
# restaurarlo junto: ahí están los cambios que el .db solo no tiene. Si no,
# borrar el WAL que haya quedado del estado previo para que no pise el restore.
if [ -f "$SRC-wal" ]; then
  echo "→ El backup incluye WAL; lo restauro también..."
  docker compose cp "$SRC-wal" prod:/app/data/taller.db-wal
else
  docker compose run --rm --no-deps prod sh -c "rm -f /app/data/taller.db-wal" >/dev/null 2>&1 || true
fi
# El -shm es solo un índice en memoria compartida; SQLite lo regenera.
docker compose run --rm --no-deps prod sh -c "rm -f /app/data/taller.db-shm" >/dev/null 2>&1 || true

# Si el backup tiene su tarball de uploads asociado (mismo nombre base que el
# .db, generado por db-backup.sh), lo restauramos también. Sin esto, los
# archivos de biblioteca/OT quedarían apuntando a nombres que no existen.
UPLOADS_SRC="${SRC%.db}-uploads.tar.gz"
if [ -f "$UPLOADS_SRC" ]; then
  echo "→ Restaurando uploads desde $UPLOADS_SRC..."
  docker compose run --rm --no-deps -T prod sh -c "rm -rf /app/uploads/* && tar xzf - -C /app/uploads" \
    <"$UPLOADS_SRC"
else
  echo "  (sin backup de uploads asociado — dejo el volume de uploads como está)"
fi

if [ "$WAS_RUNNING" -eq 1 ]; then
  echo "→ Reiniciando prod..."
  docker compose start prod
else
  echo "→ Restore listo. Arrancá prod con: docker compose up -d prod"
fi

echo "✓ Restore completado desde $SRC"
