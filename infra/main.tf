## ---------------------------------------------------------------------------
## Datos de la cuenta / red por defecto
## ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

# Usamos la VPC "default" que ya trae toda cuenta de AWS nueva, para no pagar
# un NAT Gateway ni complicar la red — para una sola instancia pública esto
# es más que suficiente y más barato.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Última imagen de Ubuntu 24.04 LTS (Canonical es el "owner" oficial).
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

## ---------------------------------------------------------------------------
## Llave SSH
## ---------------------------------------------------------------------------

resource "aws_key_pair" "this" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.ssh_public_key_path)
}

## ---------------------------------------------------------------------------
## Seguridad de red: solo SSH desde tu IP, y 80/443 abiertos para la web
## ---------------------------------------------------------------------------

resource "aws_security_group" "app" {
  name        = "${var.project_name}-app-sg"
  description = "SSH restringido a una IP + HTTP/HTTPS publico"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH solo desde la IP autorizada"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  ingress {
    description = "HTTP (necesario tambien para validar el certificado HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Todo el trafico saliente permitido"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

## ---------------------------------------------------------------------------
## S3 para comprobantes/facturas — reemplaza a MinIO en produccion
## ---------------------------------------------------------------------------

resource "aws_s3_bucket" "comprobantes" {
  bucket = "${var.project_name}-comprobantes-${data.aws_caller_identity.current.account_id}"
}

# Nadie puede hacer publico el bucket ni un objeto suyo por accidente.
resource "aws_s3_bucket_public_access_block" "comprobantes" {
  bucket                  = aws_s3_bucket.comprobantes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versionado = si algo se sobreescribe o se borra por error (o por un bug
# como el que ya encontramos con "facturas sin proyecto"), la version
# anterior del archivo se puede recuperar.
resource "aws_s3_bucket_versioning" "comprobantes" {
  bucket = aws_s3_bucket.comprobantes.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "comprobantes" {
  bucket = aws_s3_bucket.comprobantes.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Controla que el versionado no haga crecer el costo indefinidamente: las
# versiones viejas de un archivo se borran solas a los 90 dias.
resource "aws_s3_bucket_lifecycle_configuration" "comprobantes" {
  bucket = aws_s3_bucket.comprobantes.id
  rule {
    id     = "expirar-versiones-viejas"
    status = "Enabled"
    filter {
      prefix = ""
    }
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

## ---------------------------------------------------------------------------
## Rol IAM de la instancia: solo puede leer/escribir en SU bucket, nada mas.
## Asi el servidor nunca necesita una access key guardada en el .env.
## ---------------------------------------------------------------------------

resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  name = "${var.project_name}-s3-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.comprobantes.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = ["${aws_s3_bucket.comprobantes.arn}/*"]
      }
    ]
  })
}

# Permiso para que el CloudWatch Agent instalado en el servidor pueda enviar
# metricas de memoria/disco (esto no viene incluido por defecto en EC2).
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

## ---------------------------------------------------------------------------
## Contraseña de Postgres — generada una sola vez, nunca queda en el codigo.
## ---------------------------------------------------------------------------

resource "random_password" "db" {
  length  = 24
  special = false # evita caracteres que compliquen la DATABASE_URL
}

## ---------------------------------------------------------------------------
## La instancia EC2
## ---------------------------------------------------------------------------

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = aws_key_pair.this.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
    encrypted   = true
    tags = {
      Name   = "${var.project_name}-root-volume"
      Backup = "true" # el plan de snapshots (mas abajo) busca este tag
    }
  }

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "${var.project_name}-app"
  }
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags = {
    Name = "${var.project_name}-eip"
  }
}

## ---------------------------------------------------------------------------
## Backups automaticos del disco (Data Lifecycle Manager) — capa 1 de respaldo
## ---------------------------------------------------------------------------

resource "aws_iam_role" "dlm" {
  name = "${var.project_name}-dlm-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "backups" {
  description        = "Snapshot diario del disco del servidor de Ingenium"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      Backup = "true"
    }

    schedule {
      name = "diario"
      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["07:00"] # UTC ~ 2am Peru (UTC-5), horario de bajo uso
      }
      retain_rule {
        count = var.backup_retention_days
      }
      copy_tags = true
    }
  }
}

## ---------------------------------------------------------------------------
## Alertas de memoria/disco (opcional, si se completa alert_email)
## ---------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  count = var.alert_email != "" ? 1 : 0
  name  = "${var.project_name}-alertas"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "memoria_alta" {
  count               = var.alert_email != "" ? 1 : 0
  alarm_name          = "${var.project_name}-memoria-alta"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  period              = 300
  namespace           = "CWAgent"
  metric_name         = "mem_used_percent"
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "La memoria del servidor lleva 15 minutos por encima del 85%"
  dimensions          = { InstanceId = aws_instance.app.id }
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  ok_actions          = [aws_sns_topic.alerts[0].arn]
}

# NOTA: la dimension "device"/"fstype" exacta que reporta el CloudWatch
# Agent para el disco raiz puede variar segun el tipo de instancia (en
# instancias Nitro, como las t3, suele ser algo tipo "/dev/nvme0n1p1" en vez
# de "/dev/root"). Despues del primer despliegue, revisa en la consola de
# CloudWatch -> Metrics -> namespace "CWAgent" -> "disk_used_percent" cuales
# son las dimensiones reales que aparecen, y si no coinciden con las de
# abajo, ajustalas aca y volve a aplicar Terraform (si no coinciden, esta
# alarma queda "inactiva" sin avisar, sin romper nada mas).
resource "aws_cloudwatch_metric_alarm" "disco_alto" {
  count               = var.alert_email != "" ? 1 : 0
  alarm_name          = "${var.project_name}-disco-alto"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  period              = 300
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "El disco del servidor supero el 80% de uso"
  dimensions          = { InstanceId = aws_instance.app.id, path = "/", fstype = "ext4", device = "/dev/root" }
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  ok_actions          = [aws_sns_topic.alerts[0].arn]
}
