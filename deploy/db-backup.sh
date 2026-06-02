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

echo "→ Copiando DB del volume a $DEST..."
docker compose cp prod:/app/data/taller.db "$DEST"

if [ "$WAS_RUNNING" -eq 1 ]; then
  echo "→ Reiniciando prod..."
  docker compose start prod
fi

SIZE=$(du -h "$DEST" | cut -f1)
echo "✓ Backup creado: $DEST ($SIZE)"
