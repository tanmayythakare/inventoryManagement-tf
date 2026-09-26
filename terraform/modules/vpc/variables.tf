variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "The primary CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of exactly 2 availability zones to deploy subnets across"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the 2 public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for the 2 private application subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "isolated_db_subnet_cidrs" {
  description = "CIDR blocks for the 2 isolated database subnets (no internet egress)"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "enable_multi_az_nat" {
  description = "Set to true for production to provision high-availability NAT Gateways across both AZs. False uses single NAT Gateway."
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Whether to enable VPC Flow Logs to CloudWatch"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Map of tags to assign to all networking resources"
  type        = map(string)
  default     = {}
}
