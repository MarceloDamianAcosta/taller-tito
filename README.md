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

Primer login: `admin / admin1234` (se fuerza cambio de contraseña).

## Docker

```bash
# Pruebas (nuxt dev server, puerto 3001)
docker compose up --build dev

# Producción (imagen compilada, puerto 3000)
docker compose up --build prod
```

Los datos (DB y uploads) persisten en volúmenes Docker nombrados separados por ambiente.

## Variables de entorno

Crear `taller/app/.env` con:

```env
NUXT_SECRET=<string aleatorio seguro>
YOUTRACK_URL=https://taller.youtrack.cloud
YOUTRACK_TOKEN=<token>
YOUTRACK_PROJECT_ID=TITO
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
