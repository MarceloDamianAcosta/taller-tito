#!/bin/bash
# Abre sqlite3 interactivo contra la DB del contenedor prod.
# Uso: ./deploy/db-inspect.sh
set -e

cd "$(dirname "$0")/.."

if ! docker compose ps prod --status running --quiet | grep -q .; then
  echo "✗ El servicio 'prod' no está corriendo."
  echo "  Arrancalo con: docker compose up -d prod"
  exit 1
fi

echo "→ Abriendo sqlite3 en /app/data/taller.db (Ctrl+D o .exit para salir)"
docker compose exec prod sh -c "command -v sqlite3 >/dev/null || (apk add --no-cache sqlite >/dev/null 2>&1); sqlite3 /app/data/taller.db"
