#!/bin/bash
# Se corre A MANO por SSH en el servidor — la primera vez para instalar todo,
# y de nuevo cada vez que haya cambios nuevos para actualizar. Mismo espíritu
# que venimos haciendo en las otras dos computadoras (git pull, migrate,
# build, reiniciar), adaptado a este servidor. Ver docs/DESPLIEGUE_AWS.md.
set -euo pipefail

# Si el servidor tiene poca RAM (empezamos en capa gratuita, t3.micro =
# 1GB), le ponemos un techo a la memoria que Node puede usar durante el
# build. Sin esto, Node intenta usar toda la RAM que "cree" disponible
# (calculado sobre el total del sistema) y puede terminar peleando con
# Postgres/Docker en vez de usar el swap con margen — mejor que compile un
# poco más lento (usando swap) a que se cuelgue. No hace falta tocar esto
# cuando se suba a una instancia con más RAM: 768MB de techo sigue andando
# bien igual, solo que sobra más margen.
export NODE_OPTIONS="--max-old-space-size=768"

REPO_DIR="/opt/ingenium/sistema-gestion-ingenium"
REPO_URL="https://github.com/Gestionwebgs/sistema-gestion-ingenium.git"

mkdir -p /opt/ingenium
cd /opt/ingenium

if [ ! -d "$REPO_DIR" ]; then
  echo "==> Primera vez: clonando el repositorio..."
  git clone "$REPO_URL" sistema-gestion-ingenium
fi

cd "$REPO_DIR"

echo "==> Trayendo los últimos cambios..."
git pull

if [ ! -f .env ]; then
  echo ""
  echo "FALTA .env EN EL SERVIDOR."
  echo "Copiá .env.production.example a .env y completalo con los valores"
  echo "reales (contraseña de Postgres y nombre del bucket que da Terraform,"
  echo "AUTH_SECRET nuevo, datos del usuario owner). Después volvé a correr"
  echo "este script. Ver docs/DESPLIEGUE_AWS.md para el detalle."
  exit 1
fi

echo "==> Levantando Postgres y Caddy..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Permitiendo que Caddy (Docker) llegue a la app en el puerto 3005 del servidor..."
# Por defecto ufw bloquea esto (solo dejamos pasar 22/80/443) — sin este
# permiso puntual, Caddy devuelve "502 Bad Gateway" aunque la app esté bien
# arriba. Se calcula la subred de la red de Docker de este proyecto en vez
# de asumir un valor fijo, porque Docker no siempre asigna la misma. Es
# idempotente: si ya existe el permiso, ufw no lo duplica.
DOCKER_SUBNET=$(docker network inspect sistema-gestion-ingenium_default --format '{{(index .IPAM.Config 0).Subnet}}')
if [ -n "$DOCKER_SUBNET" ] && ! sudo ufw status | grep -q "$DOCKER_SUBNET.*3005"; then
  sudo ufw allow from "$DOCKER_SUBNET" to any port 3005 proto tcp
fi

echo "==> Esperando que Postgres esté listo..."
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ingenium > /dev/null 2>&1; do
  sleep 2
done

echo "==> Instalando dependencias..."
# npm ci exige que el lock file sea idéntico byte a byte a lo que instala,
# y a veces trae diferencias entre Windows (donde se genera) y Linux (donde
# se instala acá) por paquetes opcionales nativos (ej. sharp). npm install
# se auto-corrige en esos casos sin problema.
npm install

echo "==> Aplicando migraciones de Prisma..."
npx prisma migrate deploy
npx prisma generate

echo "==> Compilando la app..."
npm run build

echo "==> Instalando/actualizando el servicio systemd..."
sudo cp deploy/ingenium-app.service /etc/systemd/system/ingenium-app.service
sudo systemctl daemon-reload
sudo systemctl enable ingenium-app

echo "==> Reiniciando la app..."
sudo systemctl restart ingenium-app

echo ""
echo "==> Listo. Estado del servicio:"
sudo systemctl --no-pager status ingenium-app || true
echo ""
echo "Si es la PRIMERA vez y todavía no existe el usuario administrador,"
echo "corré una sola vez: npx prisma db seed"
