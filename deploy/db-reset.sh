#!/bin/bash
# Borra los volumes de prod (DB + uploads) y levanta de cero.
# El seed automático corre si AUTO_SEED=true en .env.
# Uso: ./deploy/db-reset.sh
set -e

cd "$(dirname "$0")/.."

cat <<EOF
✗ ATENCIÓN
  Esto va a borrar:
    - La DB local en el volume prod-data
    - Los uploads en el volume prod-uploads
  Después se levantará prod de cero (con seed si AUTO_SEED=true).
EOF

read -rp "¿Seguro? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) echo "Cancelado."; exit 1 ;;
esac

echo "→ Bajando prod y borrando volumes..."
docker compose down -v prod 2>/dev/null || docker compose down -v

echo "→ Levantando prod de cero..."
docker compose up -d --build prod

echo "→ Logs de arranque (Ctrl+C para salir):"
docker compose logs -f --tail 50 prod
