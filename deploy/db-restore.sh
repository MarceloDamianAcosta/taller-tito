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

# Borrar archivos WAL/SHM si quedaron del estado previo
docker compose run --rm --no-deps prod sh -c "rm -f /app/data/taller.db-wal /app/data/taller.db-shm" >/dev/null 2>&1 || true

if [ "$WAS_RUNNING" -eq 1 ]; then
  echo "→ Reiniciando prod..."
  docker compose start prod
else
  echo "→ Restore listo. Arrancá prod con: docker compose up -d prod"
fi

echo "✓ Restore completado desde $SRC"
