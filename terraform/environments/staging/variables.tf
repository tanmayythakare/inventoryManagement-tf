variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "pr-inventory"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "List of 2 availability zones"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private app subnets"
  type        = list(string)
  default     = ["10.1.11.0/24", "10.1.12.0/24"]
}

variable "isolated_db_subnet_cidrs" {
  description = "CIDR blocks for isolated DB subnets"
  type        = list(string)
  default     = ["10.1.21.0/24", "10.1.22.0/24"]
}

variable "enable_multi_az_nat" {
  description = "Whether to provision NAT Gateways across both AZs"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type for backend nodes"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of backend EC2 instances"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS PostgreSQL instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = true
}

variable "rds_multi_az" {
  description = "Enable RDS Multi-AZ"
  type        = bool
  default     = false
}

variable "rds_backup_retention_period" {
  description = "RDS automated backup retention in days"
  type        = number
  default     = 7
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Root domain name for SSL certificates"
  type        = string
  default     = "staging.example.internal"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID (optional)"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "devops-staging-alerts@example.com"
}

variable "tags" {
  description = "Tags applied to all environment resources"
  type        = map(string)
  default = {
    Project     = "pr-inventory"
    Environment = "staging"
    ManagedBy   = "Terraform"
  }
}
