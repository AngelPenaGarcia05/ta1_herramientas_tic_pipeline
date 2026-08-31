# ============================================================
# NovaMarket - Imagen de produccion (multi-stage)
# App: Next.js 15 (App Router, output: standalone) + Prisma
# ============================================================

# ---------- Stage 1: dependencias completas + build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# openssl y libc6-compat: requeridos por los binarios de Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl

# npm mas tolerante a redes lentas
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 600000
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# El schema de Prisma debe estar presente antes de "npm ci" porque el
# hook postinstall ejecuta "prisma generate".
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Reintenta ante fallos de red transitorios (registro npm / CDN de Prisma)
RUN --mount=type=cache,target=/root/.npm \
  ok=0; for i in 1 2 3 4 5; do npm ci && { ok=1; break; } || { echo "npm ci fallo (intento $i), reintentando..."; sleep 15; }; done; [ "$ok" = 1 ]

COPY . .

# Compila Next.js (el script build ya corre "prisma generate").
# Genera .next/standalone con solo lo necesario para ejecutar la app.
RUN npm run build

# ---------- Stage 2: runner (imagen final liviana) ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# --- App (build standalone: server.js + node_modules minimo trazado) ---
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# --- Prisma: CLI + engines + schema/migraciones para "migrate deploy" ---
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/prisma ./prisma

COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

# Por defecto: aplica migraciones y arranca la app.
# docker-compose (local) sobrescribe este comando porque el esquema ya lo
# carga PostgreSQL desde db/schema.sql.
CMD ["./docker-entrypoint.sh"]
