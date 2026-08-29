output "ip_publica" {
  description = "IP fija del servidor. Usala para entrar por SSH y, mas adelante, para el registro DNS del dominio."
  value       = aws_eip.app.public_ip
}

output "comando_ssh" {
  description = "Comando para conectarte al servidor."
  value       = "ssh -i <ruta-a-tu-clave-privada> ubuntu@${aws_eip.app.public_ip}"
}

output "s3_bucket_name" {
  description = "Nombre del bucket S3 para poner en la variable S3_BUCKET del .env del servidor."
  value       = aws_s3_bucket.comprobantes.bucket
}

output "db_password" {
  description = "Contraseña generada para Postgres — usala en DATABASE_URL del .env del servidor. Nunca se muestra en el plan/apply normal, hay que pedirla explícitamente."
  value       = random_password.db.result
  sensitive   = true
}
