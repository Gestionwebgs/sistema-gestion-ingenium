#!/usr/bin/env bash
# Actualiza esta demo local con los últimos cambios subidos desde la otra
# computadora: trae el código nuevo, instala dependencias, aplica migraciones
# de Prisma (sin borrar datos existentes) y reconstruye la app.
#
# Uso: correr en la 3ra terminal (la que NO tiene `npm run start` ni
# `cloudflared` corriendo). Antes de correrlo, andá a la 1ra terminal y
# apretá Ctrl+C para parar el servidor — dejá la del túnel intacta.
#
# Cuando termine, volvé a la 1ra terminal y corré `npm run start` de nuevo.
# El túnel de cloudflared NO hace falta reiniciarlo: sigue apuntando al
# mismo puerto y la URL pública que ya tiene el cliente no cambia.

set -e  # si algo falla, el script se detiene ahí en vez de seguir a ciegas

echo "==> 1/5 Bajando cambios de GitHub (git pull)..."
git pull

echo "==> 2/5 Instalando dependencias (npm install)..."
npm install

echo "==> 3/5 Regenerando cliente de Prisma..."
npx prisma generate

echo "==> 4/5 Aplicando migraciones nuevas (no borra datos existentes)..."
npx prisma migrate deploy

echo "==> 5/5 Compilando la app (npm run build)..."
npm run build

echo ""
echo "Listo. Ahora andá a la 1ra terminal y corré: npm run start"
echo "(no hace falta tocar la terminal del túnel de cloudflared)"
