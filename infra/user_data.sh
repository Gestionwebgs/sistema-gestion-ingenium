#!/bin/bash
# Bootstrap del servidor — corre UNA sola vez, automaticamente, cuando la
# instancia EC2 arranca por primera vez. Solo prepara el sistema operativo
# (Docker, firewall, seguridad, monitoreo). NO toca el codigo de la app ni
# la base de datos — eso se hace a mano por SSH con deploy/deploy.sh, la
# primera vez y en cada actualizacion futura. Ver docs/DESPLIEGUE_AWS.md.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

## 1) Actualizar el sistema -----------------------------------------------
apt-get update -y
apt-get upgrade -y

## 2) Docker + Docker Compose ----------------------------------------------
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

usermod -aG docker ubuntu

## 3) Node.js 20 LTS (para correr la app con systemd, fuera de Docker) -----
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

## 4) Swap de 2GB — colchon extra ademas de los 4GB de RAM reales ----------
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  # Un servidor no necesita "swappiness" agresivo — que use RAM primero y
  # solo recurra al swap como red de seguridad, no como uso normal.
  sysctl -w vm.swappiness=10
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

## 5) Firewall (ufw) --------------------------------------------------------
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

## 6) fail2ban contra intentos de fuerza bruta por SSH ---------------------
systemctl enable --now fail2ban

## 7) Actualizaciones de seguridad automaticas ------------------------------
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

## 8) Endurecer SSH (defensa extra, aunque el security group ya restringe
##    el acceso a una sola IP) ----------------------------------------------
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

## 9) CloudWatch Agent (metricas de memoria y disco, que EC2 no manda
##    solo) ------------------------------------------------------------------
curl -fsSL https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb -o /tmp/amazon-cloudwatch-agent.deb
dpkg -i -E /tmp/amazon-cloudwatch-agent.deb || apt-get install -f -y

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "InstanceId": "${aws:InstanceId}" },
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"], "metrics_collection_interval": 60 },
      "disk": {
        "measurement": ["disk_used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      }
    }
  }
}
EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

## 10) Carpeta de trabajo para el deploy ------------------------------------
mkdir -p /opt/ingenium
chown ubuntu:ubuntu /opt/ingenium

echo "Bootstrap del servidor listo. Ahora segui docs/DESPLIEGUE_AWS.md para clonar el repo y desplegar la app." > /opt/ingenium/BOOTSTRAP_OK
