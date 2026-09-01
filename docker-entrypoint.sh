#!/bin/sh
set -e

# ============================================================
# Arranque de la app en produccion (Render / Docker Hub).
# 1. Aplica las migraciones Prisma pendientes contra DATABASE_URL.
# 2. Arranca el servidor Next.js.
#
# En local con docker-compose este script NO se ejecuta: el compose
# sobrescribe el comando porque PostgreSQL ya carga db/schema.sql.
# ============================================================

echo "==> Aplicando migraciones de base de datos (prisma migrate deploy)..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "==> Iniciando NovaMarket en el puerto ${PORT:-3000}..."
exec node_modules/.bin/next start -p "${PORT:-3000}"
