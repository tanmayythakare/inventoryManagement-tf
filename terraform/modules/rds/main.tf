terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# ==============================================================================
# Database Credentials Generation
# ==============================================================================
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ==============================================================================
# DB Subnet Group (Strictly Isolated Private Subnets)
# ==============================================================================
resource "aws_db_subnet_group" "db" {
  name        = "${var.environment}-rds-subnet-group"
  subnet_ids  = var.isolated_db_subnet_ids
  description = "Isolated private database subnets with zero internet access"

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-rds-subnet-group"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# PostgreSQL 16 Parameter Group
# ==============================================================================
resource "aws_db_parameter_group" "pg16" {
  name   = "${var.environment}-pg16-param-group"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-pg16-param-group"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Amazon RDS PostgreSQL 16 Instance
# ==============================================================================
resource "aws_db_instance" "postgres" {
  identifier             = "${var.environment}-postgres-db"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.database_name
  username = var.admin_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [var.rds_security_group_id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  # Security and reliability configurations
  publicly_accessible       = false
  multi_az                  = var.multi_az
  deletion_protection       = var.deletion_protection
  backup_retention_period   = var.backup_retention_period
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.environment}-postgres-db-final-snapshot"
  auto_minor_version_upgrade = true
  apply_immediately         = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-postgres-db"
      Engine      = "PostgreSQL-16"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# AWS Systems Manager Parameter Store (Encrypted Secrets & Connection Info)
# ==============================================================================
resource "aws_ssm_parameter" "db_host" {
  name        = "/inventory-api/db_host"
  description = "Amazon RDS PostgreSQL endpoint host"
  type        = "String"
  value       = aws_db_instance.postgres.address
  overwrite   = true

  tags = var.tags
}

resource "aws_ssm_parameter" "db_port" {
  name        = "/inventory-api/db_port"
  description = "Amazon RDS PostgreSQL endpoint port"
  type        = "String"
  value       = tostring(aws_db_instance.postgres.port)
  overwrite   = true

  tags = var.tags
}

resource "aws_ssm_parameter" "db_name" {
  name        = "/inventory-api/db_name"
  description = "Amazon RDS PostgreSQL database name"
  type        = "String"
  value       = var.database_name
  overwrite   = true

  tags = var.tags
}

resource "aws_ssm_parameter" "db_user" {
  name        = "/inventory-api/db_user"
  description = "Amazon RDS PostgreSQL master username"
  type        = "String"
  value       = var.admin_username
  overwrite   = true

  tags = var.tags
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/inventory-api/db_password"
  description = "Amazon RDS PostgreSQL master password"
  type        = "SecureString"
  value       = random_password.db_password.result
  overwrite   = true

  tags = var.tags
}
