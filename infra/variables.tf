variable "aws_region" {
  description = "Región de AWS donde se crea todo. us-east-1 es de las más baratas."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombrar los recursos (instancia, bucket, etc.)."
  type        = string
  default     = "ingenium"
}

variable "instance_type" {
  description = "Tamaño de la instancia EC2. t3.medium = 2 vCPU / 4GB RAM."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size_gb" {
  description = "Tamaño del disco raíz (EBS) en GB. Ahí vive Docker, Postgres y los builds."
  type        = number
  default     = 30
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    Desde qué IP se puede conectar por SSH (puerto 22), en formato CIDR
    (ej. "181.65.12.34/32" para una sola IP). NUNCA dejar "0.0.0.0/0" acá —
    eso abriría SSH a todo internet. Para saber tu IP pública actual, entrá a
    https://checkip.amazonaws.com desde el navegador de la compu donde vas a
    hacer SSH.
  EOT
  type = string
}

variable "ssh_public_key_path" {
  description = "Ruta al archivo de clave pública SSH (la que generás con ssh-keygen) que se instala en el servidor."
  type        = string
  default     = "~/.ssh/ingenium_aws_ed25519.pub"
}

variable "backup_retention_days" {
  description = "Cuántos snapshots diarios del disco se conservan antes de borrar los más viejos."
  type        = number
  default     = 7
}

variable "alert_email" {
  description = "Correo al que llegan las alertas si el servidor se queda corto de memoria o disco. Dejalo vacío para no crear alertas."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = <<-EOT
    Dominio de la app (ej. "app.ingeniumservice.com"), sin "https://" ni "/".
    Dejalo vacío mientras no tengas el dominio todavía — la app funciona
    igual por HTTP con la IP fija. Cuando tengas el dominio, apuntá su DNS
    (registro A) a la IP elástica que da este Terraform, poné el dominio acá,
    y volvé a aplicar Terraform (esto regenera el Caddyfile con HTTPS
    automático). Ver docs/DESPLIEGUE_AWS.md.
  EOT
  type    = string
  default = ""
}
