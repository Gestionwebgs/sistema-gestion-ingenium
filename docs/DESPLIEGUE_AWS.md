# Despliegue en AWS — guía paso a paso

Esta guía documenta cómo se desplegó el sistema en un servidor real de AWS,
para que quede como referencia si hay que recrearlo, entenderlo, o hacerlo
crecer más adelante. Está escrita para correrse una sola vez (la primera
instalación); las actualizaciones de código después de esto son mucho más
cortas (ver "Actualizar la app" al final).

## Nota: arrancamos en capa gratuita, no en t3.medium

La cuenta de AWS es nueva, y por defecto AWS limita a las cuentas nuevas a
0 vCPUs de instancias "fuera de capa gratuita" (una medida antifraude
estándar) hasta aprobar un aumento de cuota. Por eso, aunque la decisión
original fue `t3.medium`, el **primer despliegue real usa `t3.micro`**
(capa gratuita, 1GB de RAM) mientras se aprueba la cuota — ver
`infra/terraform.tfvars`, línea `instance_type = "t3.micro"`.

**Cómo pedir el aumento de cuota** (para poder subir a t3.medium después):
Consola de AWS → **Service Quotas** → **AWS services** → **EC2** → cuota
**"Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances"** →
**Request increase at account-level** → pedí, por ejemplo, **8** vCPUs.
Suele aprobarse solo en minutos; en cuentas muy nuevas puede tardar hasta
24-48hs.

**Cuando se apruebe**: en `infra/terraform.tfvars`, borrá o comentá la
línea `instance_type = "t3.micro"` (vuelve al default `t3.medium` de
`infra/variables.tf`) y corré `terraform apply` de nuevo. Terraform
redimensiona la instancia existente (la apaga, cambia el tamaño, la prende)
— **no se pierde nada del disco ni de la base de datos**, es la misma
instancia y el mismo volumen EBS todo el tiempo.

**Cuidados extra mientras estemos en 1GB de RAM** (para que no se cuelgue,
que era la preocupación original): se ajustó el despliegue especialmente
para esto:
- El swap del servidor se subió a 4GB (4 veces la RAM real) en vez del
  tamaño normal — le da al sistema un colchón grande para no matar
  procesos por falta de memoria, a costa de que todo vaya más lento cuando
  lo usa.
- `deploy/deploy.sh` limita el build de Next.js a un techo de memoria
  (`NODE_OPTIONS=--max-old-space-size=768`) para que Node no intente acaparar
  toda la RAM disponible y deje lugar a Postgres/Docker.
- `docker-compose.prod.yml` le pone un techo de memoria a Postgres (300MB)
  y a Caddy (100MB), para asegurar que siempre quede RAM disponible para la
  app, que es la que más necesita durante el build.
- **Esperá que el build tarde bastante más que en tu computadora** (puede
  ser varios minutos, contra los ~10-90 segundos que vimos en las otras
  máquinas) — es normal, está usando swap. Si `./deploy/deploy.sh` parece
  "colgado" en el paso de `npm run build`, dale tiempo antes de asumir que
  falló.

## Arquitectura elegida y por qué

Todo corre en **una sola instancia EC2** (t3.medium: 2 vCPU / 4GB RAM),
excepto los archivos adjuntos (fotos/PDF de facturas), que van a un bucket
S3 real. Se decidió así, en vez de repartir cada pieza en un servicio
gestionado distinto (RDS, App Runner, etc.), porque:

- Es lo que se pidió explícitamente: simple, todo junto, fácil de entender
  y de operar por una sola persona.
- Con 4GB de RAM hay margen de sobra para Postgres + la app + el build,
  incluso con Cotizaciones y Facturación ya sumadas al sistema — el
  problema de "se cuelga con 2GB" que tuvimos en las demos locales no
  debería repetirse acá.
- Sacar los archivos a S3 real (en vez de un MinIO corriendo en el mismo
  servidor) es prácticamente gratis a este volumen, saca un proceso más de
  la RAM del servidor, y es más seguro y duradero: si el disco del servidor
  se dañara, los archivos en S3 no se pierden (S3 los guarda replicados en
  varios centros de datos de Amazon, ajeno a la instancia).

**Piezas y dónde vive cada una:**

| Pieza | Dónde corre | Por qué |
|---|---|---|
| App Next.js | Directo en el servidor (systemd) | Simplicidad — es exactamente el mismo `npm run start` que ya usamos en las otras dos computadoras, no hay nada nuevo que depurar |
| Postgres | Docker, en el mismo servidor | Ya lo usamos así en desarrollo, comportamiento probado |
| Caddy (proxy + HTTPS) | Docker, en el mismo servidor | Da HTTPS automático y gratis (Let's Encrypt) apenas haya un dominio, sin configurar nada a mano |
| Archivos (facturas/comprobantes) | S3 real | Barato, duradero, sin ocupar RAM del servidor |
| Backups del disco | Snapshots automáticos diarios (AWS DLM) | Corre solo, sin intervención, se puede restaurar todo el servidor desde un snapshot |
| Alertas de memoria/disco | CloudWatch (opcional, con tu correo) | Para enterarnos ANTES de que el servidor se cuelgue, no después |

**Seguridad aplicada** (todas por defecto, sin nada opcional):

- El puerto SSH (22) solo acepta conexiones desde tu IP — no está abierto a
  internet.
- No hay usuario root en el servidor con acceso remoto; se entra siempre
  con una clave SSH, nunca con contraseña.
- `fail2ban` bloquea automáticamente IPs que intenten forzar el SSH.
- El servidor se actualiza solo con los parches de seguridad del sistema
  operativo (`unattended-upgrades`).
- Postgres no está expuesto a internet ni siquiera dentro del propio
  servidor a otras interfaces — solo escucha en `localhost`.
- El servidor nunca tiene guardada una clave de acceso a AWS: usa un "rol
  IAM" que le da automáticamente, y de forma temporal, permiso para leer y
  escribir SOLO en su propio bucket S3 — nada más de tu cuenta de AWS.
- El disco está cifrado (EBS encriptado).
- El bucket S3 tiene bloqueado el acceso público (nadie puede verlo desde
  internet aunque tenga el link) y versionado activado (si algo se borra o
  sobreescribe por error, se puede recuperar la versión anterior).

## Costo estimado mensual

Con t3.medium en `us-east-1`, aproximadamente:

- Instancia EC2 t3.medium: ~USD 30/mes
- Disco EBS 30GB gp3: ~USD 2.5/mes
- IP elástica: gratis mientras esté asociada a una instancia corriendo
- Snapshots diarios (7 días de historial): unos pocos centavos/mes al
  principio, crece un poco con el tiempo según cuánto cambie el disco
- Bucket S3 (fotos de facturas): centavos/mes a este volumen
- CloudWatch (métricas + 1-2 alarmas): dentro de la capa gratuita en la
  mayoría de los casos

**Total aproximado: USD 33-35/mes.** Si en algún momento se quiere volver a
apuntar a la capa gratuita real (0 USD, con 1GB de RAM en vez de 4GB), basta
con cambiar `instance_type` a `t3.micro` en `infra/variables.tf` y volver a
aplicar Terraform — pero con Cotizaciones/Facturación ya sumadas, no se
recomienda bajar de t3.small (2GB) para no repetir los cuelgues que ya
tuvimos.

## Antes de empezar (una sola vez)

### 1. Instalar Terraform y AWS CLI en tu computadora

- Terraform: https://developer.hashicorp.com/terraform/install
- AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

### 2. Generar las "access keys" de tu usuario administrador de IAM

(El usuario que ya creamos para no usar root — ver conversación anterior.)
En la consola de AWS: **IAM → Users → tu usuario administrador → Security
credentials → Access keys → Create access key** (elegí "Command Line
Interface (CLI)"). Guardá el "Access key ID" y el "Secret access key" — solo
se muestran una vez.

En tu terminal:
```
aws configure
```
Pegá el Access key ID, el Secret access key, la región (`us-east-1`), y
formato de salida `json`.

**Importante de seguridad**: estas claves quedan guardadas en tu propia
computadora (`~/.aws/credentials`), nunca se suben a git ni se comparten.

### 3. Generar tu clave SSH para el servidor

```
ssh-keygen -t ed25519 -f ~/.ssh/ingenium_aws_ed25519 -C "gerson-aws"
```
Podés dejar la passphrase vacía (Enter) o ponerle una, como prefieras.

### 4. Averiguar tu IP pública

Entrá a https://checkip.amazonaws.com desde el navegador — anotá el número
que te muestra.

### 5. Configurar las variables de Terraform

```
cd infra
cp terraform.tfvars.example terraform.tfvars
```
Editá `terraform.tfvars` y completá:
- `ssh_allowed_cidr`: tu IP del paso 4, con `/32` al final (ej.
  `"181.65.12.34/32"`)
- `ssh_public_key_path`: la ruta de la clave del paso 3 (ya viene bien por
  default si usaste el mismo comando)
- `alert_email` (opcional): tu correo para alertas de memoria/disco
- `domain_name`: dejalo vacío por ahora

## Crear la infraestructura

```
cd infra
terraform init
terraform plan
```

Revisá el plan — te va a mostrar todo lo que se va a crear (instancia,
bucket, reglas de seguridad, etc.), sin crear nada todavía. Si se ve bien:

```
terraform apply
```

Escribí `yes` cuando te lo pida. Tarda 1-3 minutos.

Al terminar, anotá la salida:
```
terraform output ip_publica
terraform output s3_bucket_name
terraform output -raw db_password
```
(`db_password` sale oculto por seguridad en el resumen normal — por eso hay
que pedirlo con `-raw` explícitamente.)

## Primer despliegue de la app

Esperá 2-3 minutos después del `apply` para que el servidor termine de
instalar todo solo (Docker, firewall, etc. — ver `infra/user_data.sh`).
Después conectate:

```
ssh -i ~/.ssh/ingenium_aws_ed25519 ubuntu@<ip_publica_de_terraform>
```

Ya adentro del servidor:

```bash
git clone https://github.com/Gestionwebgs/sistema-gestion-ingenium.git /opt/ingenium/sistema-gestion-ingenium
cd /opt/ingenium/sistema-gestion-ingenium
cp .env.production.example .env
nano .env
```

En el `.env`, completá:
- `DATABASE_URL` y `POSTGRES_PASSWORD`: pegá el valor de
  `terraform output -raw db_password` en los dos lugares.
- `S3_BUCKET`: pegá el valor de `terraform output s3_bucket_name`.
- `AUTH_SECRET`: generalo con `npx auth secret` (corré ese comando ahí
  mismo, en el servidor).
- `SEED_OWNER_NAME` / `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`: los datos
  del usuario administrador real de producción (contraseña distinta a la de
  las otras computadoras de prueba).

Guardá (`Ctrl+O`, Enter, `Ctrl+X` en nano) y corré:

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Este script instala dependencias, aplica las migraciones, compila, y deja la
app corriendo con reinicio automático (systemd). La primera vez, al final,
creá el usuario administrador:

```bash
npx prisma db seed
```

Probá entrando a `http://<ip_publica>` desde el navegador — ya debería
funcionar.

## Cuando tengas el dominio

1. En tu proveedor de DNS, creá un registro **A** apuntando el dominio (o
   subdominio, ej. `app.tuempresa.com`) a la IP pública de
   `terraform output ip_publica`.
2. En `infra/terraform.tfvars`, completá `domain_name` con el dominio.
3. Editá `Caddyfile` en el repo: comentá el bloque `:80 { ... }` y
   descomentá el bloque `tudominio.com { ... }`, poniendo tu dominio real.
4. `git add Caddyfile && git commit -m "..." && git push`.
5. En el servidor: `git pull && docker compose -f docker-compose.prod.yml restart caddy`.

Caddy va a pedir el certificado HTTPS solo (puede tardar unos segundos) y de
ahí en más lo renueva automáticamente para siempre, sin que haya que hacer
nada.

## Actualizar la app (después del primer despliegue)

Cada vez que haya cambios nuevos para llevar a producción:

```bash
ssh -i ~/.ssh/ingenium_aws_ed25519 ubuntu@<ip_publica>
cd /opt/ingenium/sistema-gestion-ingenium
./deploy/deploy.sh
```

El script hace `git pull`, aplica migraciones si hay, compila, y reinicia el
servicio solo. Mismo espíritu que en las otras dos computadoras, solo que
acá corre por SSH en vez de en una terminal local.

## Backups y cómo restaurar

**Automático**: todos los días a las 07:00 UTC (~2am Perú) se saca un
snapshot completo del disco del servidor (Postgres incluido, porque sus
datos viven en ese mismo disco). Se conservan los últimos 7.

**Ver los snapshots**: consola de AWS → EC2 → Snapshots (o *Elastic Block
Store* → Snapshots), filtrando por la instancia.

**Restaurar todo el servidor desde un snapshot** (ej. si el disco se
corrompe): EC2 → Snapshots → elegí el snapshot → "Create volume" → una vez
creado el volumen, se desmonta el disco viejo de la instancia y se monta
este en su lugar (EC2 → Instances → parar la instancia → Volumes →
detach/attach). Es un procedimiento manual de EC2, no hace falta Terraform
para esto.

**Backup adicional recomendado (a futuro, no crítico ahora)**: un `pg_dump`
diario comprimido subido al mismo bucket S3, como segunda capa de respaldo
más liviana y rápida de restaurar que un snapshot completo del disco. Queda
anotado como mejora futura, no incluido en esta primera versión.

## Problemas encontrados en el primer despliegue real (y cómo se resolvieron)

Por si se repite alguno al recrear el servidor desde cero:

- **`npm ci` falla con "can only install packages when... are in sync"**: el
  `package-lock.json` se generó en Windows y le faltaban entradas de
  paquetes opcionales nativos de Linux (de `sharp`). Se resolvió usando
  `npm install` en vez de `npm ci` — ya está así en `deploy/deploy.sh`, no
  hace falta hacer nada a mano la próxima vez.
- **`P1000: Authentication failed` al correr `prisma migrate deploy`**: la
  contraseña de `DATABASE_URL` y la de `POSTGRES_PASSWORD` en el `.env` no
  coincidían (se completaron a mano y quedó un desfasaje). Postgres solo fija
  la contraseña la PRIMERA vez que arranca con el volumen vacío — si esto
  pasa, hay que bajar el contenedor, **borrar el volumen**
  (`docker volume rm sistema-gestion-ingenium_postgres_data`, seguro
  mientras no haya datos reales todavía) y levantarlo de nuevo con las dos
  contraseñas ya coincidiendo. Para evitarlo: copiar el valor de
  `terraform output -raw db_password` una sola vez y pegarlo igual en los
  dos lugares del `.env`, sin retipearlo.
- **Caddy responde "502 Bad Gateway" aunque la app esté corriendo bien**:
  `ufw` bloquea por defecto el tráfico interno de Docker hacia el puerto
  3005 del servidor (solo se permite 22/80/443 explícitamente). Ya
  resuelto de forma automática: `deploy/deploy.sh` calcula la subred de la
  red de Docker del proyecto y agrega el permiso de `ufw` solo para esa
  subred y ese puerto — no hace falta ningún paso manual.
- **`npx auth secret` da una variable `BETTER_AUTH_SECRET` en vez de
  `AUTH_SECRET`**: ese paquete de npm cambió de dueño/propósito (es de otra
  librería, "Better Auth", no la que usa este proyecto). Para generar el
  secreto de Auth.js a mano: `openssl rand -base64 32`, y ponerlo en
  `AUTH_SECRET` del `.env`.

## Notas para el futuro / limitaciones conocidas

- El estado de Terraform (`infra/terraform.tfstate`) queda solo en tu
  computadora — hacé una copia de respaldo de esa carpeta `infra/` completa
  (fuera de git) de vez en cuando. Si varias personas van a manejar la
  infraestructura more adelante, conviene migrar ese estado a un backend
  remoto (S3 + bloqueo).
- La alarma de disco de CloudWatch depende de un nombre de dispositivo
  (`/dev/root`) que puede no coincidir exactamente en instancias Nitro como
  esta — revisar en CloudWatch → Metrics → `CWAgent` después del primer
  despliegue y ajustar `infra/main.tf` si hace falta (ver el comentario ahí
  mismo).
- Si en algún momento el tráfico o el volumen de datos crece mucho más,
  separar Postgres a una instancia RDS gestionada (con backups
  point-in-time automáticos) es el siguiente paso natural — hoy no hace
  falta a esta escala.
