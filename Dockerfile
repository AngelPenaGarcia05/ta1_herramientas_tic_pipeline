# ============================================================
# NovaMarket - Imagen de produccion (multi-stage)
# App: Next.js 15 (App Router) + Prisma
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
# Se elimina .next/cache: es cache de compilacion, no se usa en runtime.
RUN npm run build && rm -rf .next/cache

# ---------- Stage 2: node_modules SOLO de produccion ----------
# Se parte del builder (todo instalado + cliente Prisma ya generado) y se PODAN
# las devDependencies. El arbol de node_modules queda COMPLETO y con sus
# symlinks intactos: asi el CLI de Prisma dispone de TODAS sus dependencias
# (@prisma/config, effect, etc.) y de sus archivos WASM para "migrate deploy".
FROM builder AS prod-deps
RUN npm prune --omit=dev \
  # Alpine usa musl: el binario SWC de glibc no se usa nunca (ahorra ~135 MB)
  && rm -rf node_modules/@next/swc-linux-x64-gnu

# ---------- Stage 3: runner (imagen final) ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Usuario no root. Se crea su HOME para caches de Prisma/Next.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --home /home/nextjs nextjs \
  && mkdir -p /home/nextjs && chown -R nextjs:nodejs /home/nextjs
ENV HOME=/home/nextjs

# --- node_modules de produccion COMPLETO ---
COPY --from=prod-deps /app/node_modules ./node_modules
# --- Artefactos de la app (build de Next + estaticos) ---
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
# --- Esquema + migraciones (los usa "prisma migrate deploy" al arrancar) ---
COPY --from=builder /app/prisma ./prisma

# Verificacion: si el CLI de Prisma, su motor WASM o una dep transitiva no
# quedaron completos, el BUILD falla aqui (nunca se publica una imagen que
# no pueda ejecutar "prisma migrate deploy").
RUN node ./node_modules/prisma/build/index.js -v \
  && node -e "require.resolve('effect')" \
  && test -f node_modules/prisma/build/prisma_schema_build_bg.wasm

COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

# Por defecto: aplica migraciones y arranca la app.
# docker-compose (local) sobrescribe este comando porque el esquema ya lo
# carga PostgreSQL desde db/schema.sql.
CMD ["./docker-entrypoint.sh"]
