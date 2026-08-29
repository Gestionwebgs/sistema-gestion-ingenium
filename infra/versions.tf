terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Por ahora el estado de Terraform queda LOCAL (terraform.tfstate en esta
  # misma carpeta, ya ignorado por .gitignore). Ese archivo tiene datos
  # sensibles (ej. la contraseña de Postgres) — no se sube a git y conviene
  # guardar una copia de respaldo en un lugar seguro (no en el repo).
  # Más adelante, si varias personas van a correr Terraform, conviene migrar
  # a un backend remoto (bucket S3 + DynamoDB para el lock). No hace falta
  # todavía para un solo administrador.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Proyecto  = "sistema-gestion-ingenium"
      Entorno   = "produccion"
      GestionadoPor = "terraform"
    }
  }
}
