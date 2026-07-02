#!/bin/bash
# Exporta taller.db del volume a un archivo en ./backups/
# Uso: ./deploy/db-backup.sh [nombre]
#   Sin nombre → backups/taller-YYYYMMDD-HHMM.db
#   Con nombre → backups/<nombre>.db
set -e

cd "$(dirname "$0")/.."

mkdir -p backups

if [ -n "$1" ]; then
  DEST="backups/$1.db"
else
  DEST="backups/taller-$(date +%Y%m%d-%H%M).db"
fi

if [ -f "$DEST" ]; then
  read -rp "✗ Ya existe $DEST. ¿Sobrescribir? [y/N] " confirm
  case "$confirm" in
    y|Y|yes|YES) ;;
    *) echo "Cancelado."; exit 1 ;;
  esac
fi

# Detenemos prod para que SQLite no esté escribiendo cuando copiamos
WAS_RUNNING=0
if docker compose ps prod --status running --quiet | grep -q .; then
  WAS_RUNNING=1
  echo "→ Deteniendo prod para backup consistente..."
  docker compose stop prod
fi

# Con WAL activo los datos pueden vivir en taller.db-wal y no en taller.db
# (si node no cerró la DB limpiamente, p.ej. SIGKILL al parar el contenedor,
# el checkpoint nunca corre y taller.db queda viejo/vacío). Consolidamos el
# WAL en la DB con un one-off container antes de copiar. La imagen prod no
# trae sqlite3 CLI; usamos el better-sqlite3 del output de Nitro.
echo "→ Consolidando WAL en la DB (checkpoint)..."
CHECKPOINT_OK=1
docker compose run --rm --no-deps prod node -e \
  "require('/app/server/node_modules/better-sqlite3')('/app/data/taller.db').pragma('wal_checkpoint(TRUNCATE)')" \
  >/dev/null 2>&1 || CHECKPOINT_OK=0

echo "→ Copiando DB del volume a $DEST..."
docker compose cp prod:/app/data/taller.db "$DEST"

if [ "$CHECKPOINT_OK" -eq 0 ]; then
  # Sin checkpoint el .db puede estar incompleto: llevamos también el WAL.
  # db-restore.sh lo detecta ($DEST-wal al lado del .db) y lo restaura junto.
  echo "  ⚠ el checkpoint falló; copio también -wal/-shm por las dudas"
  docker compose cp prod:/app/data/taller.db-wal "$DEST-wal" 2>/dev/null || true
  docker compose cp prod:/app/data/taller.db-shm "$DEST-shm" 2>/dev/null || true
fi

if [ "$WAS_RUNNING" -eq 1 ]; then
  echo "→ Reiniciando prod..."
  docker compose start prod
fi

SIZE=$(du -h "$DEST" | cut -f1)
echo "✓ Backup creado: $DEST ($SIZE)"
