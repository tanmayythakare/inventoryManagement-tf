variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "isolated_db_subnet_ids" {
  description = "List of isolated private DB subnet IDs"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security Group ID for RDS"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in gigabytes"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in gigabytes"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Name of the default PostgreSQL database"
  type        = string
  default     = "inventorydb"
}

variable "admin_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "inventoryadmin"
}

variable "multi_az" {
  description = "Specifies if the RDS instance is multi-AZ"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "If the DB instance should have deletion protection enabled"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "The days to retain backups for"
  type        = number
  default     = 1
}

variable "skip_final_snapshot" {
  description = "Determines whether a final DB snapshot is created before the DB instance is deleted"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to assign to the RDS resources"
  type        = map(string)
  default     = {}
}
