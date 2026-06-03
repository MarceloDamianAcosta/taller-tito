FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── Dev: hot-reload con volumen montado ─────────────────────────────────────
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "dev"]

# ── Build: compila el output de producción ───────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Prod: solo el output compilado ───────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app
RUN mkdir -p /app/uploads /app/data /app/control
COPY --from=build /app/.output ./
COPY --from=build /app/server/db/migrations ./server/db/migrations

# Versión horneada en la imagen: el endpoint /api/admin/sistema lee version.json
# para mostrar versión/fecha/commit. El rótulo legible (ej. "0.4") sale del archivo
# VERSION del repo (se sube un escalón por release); GIT_SHA/BUILD_TIME los pasa
# docker compose como build-args.
ARG GIT_SHA=dev
ARG BUILD_TIME=
COPY VERSION ./VERSION
RUN printf '{"version":"%s","sha":"%s","builtAt":"%s"}\n' "$(cat /app/VERSION)" "$GIT_SHA" "$BUILD_TIME" > /app/version.json
ENV NUXT_APP_SHA=$GIT_SHA

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.mjs"]
