output "db_instance_id" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.postgres.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.postgres.arn
}

output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "db_instance_address" {
  description = "The DNS address of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "db_instance_port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "db_username" {
  description = "Master username for the database"
  value       = aws_db_instance.postgres.username
}

output "db_password" {
  description = "Master database password (sensitive)"
  value       = random_password.db_password.result
  sensitive   = true
}

output "db_host_ssm_parameter" {
  description = "SSM Parameter Store name for DB Host"
  value       = aws_ssm_parameter.db_host.name
}

output "db_password_ssm_parameter" {
  description = "SSM Parameter Store name for DB Password"
  value       = aws_ssm_parameter.db_password.name
}
