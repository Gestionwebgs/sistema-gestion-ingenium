#!/bin/bash
# Se corre A MANO por SSH en el servidor — la primera vez para instalar todo,
# y de nuevo cada vez que haya cambios nuevos para actualizar. Mismo espíritu
# que venimos haciendo en las otras dos computadoras (git pull, migrate,
# build, reiniciar), adaptado a este servidor. Ver docs/DESPLIEGUE_AWS.md.
set -euo pipefail

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

echo "==> Esperando que Postgres esté listo..."
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ingenium > /dev/null 2>&1; do
  sleep 2
done

echo "==> Instalando dependencias..."
npm ci

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
