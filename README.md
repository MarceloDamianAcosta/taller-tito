# Taller Tito — Sistema de Gestión

Aplicación web de gestión para taller metalúrgico/fabricación. Uso exclusivo en red WiFi local.
Accesible desde celular, tablet y escritorio.

## Módulos

- **Dashboard** — KPIs, alertas y órdenes en curso
- **Órdenes de Trabajo** — CRUD completo, estados, materiales, archivos adjuntos, control de calidad y no conformidades
- **Clientes** — alta y gestión
- **Catálogo de Materiales** — stock y unidades
- **Biblioteca de Archivos** — planos, fotos, documentos
- **Mantenimiento** — máquinas y registro de revisiones
- **Indicadores** — métricas por período
- **Admin Usuarios** — roles admin/técnico

## Stack

- **Nuxt 4** + Nuxt UI v4
- **Drizzle ORM** + SQLite (better-sqlite3)
- **nuxt-auth-utils** — sesiones encriptadas en cookie
- **bcryptjs** — hash de contraseñas (cost 12)
- **pnpm** como package manager

## Desarrollo local

```bash
pnpm install
pnpm dev
# → http://localhost:3000
```

Primer login: `tito / bigboss` (se fuerza cambio de contraseña).

## Docker

```bash
# Pruebas (nuxt dev server, puerto 3001)
docker compose up --build dev

# Producción (imagen compilada, puerto 3000)
docker compose up --build prod
```

Los datos (DB y uploads) persisten en volúmenes Docker nombrados separados por ambiente.

## Workflow de pruebas y deploy

| Lugar | Ruta | Para qué | Quién edita |
|---|---|---|---|
| **Dev** | PC de desarrollo | `pnpm dev` + commits. Edición de código. | sí |
| **Mirror local** | `/opt/taller/app` en la PC de Tito | Espejo de producción para probar antes del taller. Solo `git pull` + Docker. | NO |
| **Taller** | `/opt/taller/app` en la PC del taller | Producción real. Solo `git pull` + Docker. | NO |

Ciclo: editar en Dev → `git push` → en Mirror local `git pull && docker compose up --build prod` → probar → si anda, mismo `git pull` en el taller.

### AUTO_SEED

El mirror local debe tener `AUTO_SEED=true` en su `.env`. Cuando la DB arranca vacía, se cargan datos sintéticos (3 clientes, 3 máquinas, 12 materiales, 10 OTs en variados estados, controles, NCs, mantenimientos). Si la DB ya tiene clientes, el seed no corre.

**El `.env` del taller NO debe tener `AUTO_SEED=true`** — doble candado para que datos sintéticos nunca contaminen producción.

### Scripts helper (en `deploy/`)

Para gestionar la DB del volume desde el host:

```bash
./deploy/db-inspect.sh              # abre sqlite3 interactivo dentro del contenedor
./deploy/db-backup.sh [nombre]      # backup → ./backups/<nombre>.db (default: timestamped)
./deploy/db-reset.sh                # borra volumes y re-arranca de cero (con confirmación)
./deploy/db-restore.sh <archivo.db> # restaura un backup al volume (con confirmación)
```

## Variables de entorno

Crear `taller/app/.env` con:

```env
NUXT_SECRET=<string aleatorio seguro>
NUXT_SESSION_PASSWORD=<string aleatorio de 32+ chars>
YOUTRACK_URL=https://taller.youtrack.cloud
YOUTRACK_TOKEN=<token>
YOUTRACK_PROJECT_ID=TITO
# Solo en Mirror local — NUNCA en taller:
# AUTO_SEED=true
```

## Flujo Git

| Branch | Propósito |
|---|---|
| `develop` | Desarrollo activo — se trabaja y prueba acá |
| `master` | Producción — solo merge desde develop |

```bash
# Al terminar una sesión de trabajo
git add -A
git commit -m "descripción"
git push

# Pasar a producción
git checkout master
git merge develop
git push
git checkout develop
```

## CI

GitHub Actions corre lint + typecheck en cada push a `develop` y `master`.
