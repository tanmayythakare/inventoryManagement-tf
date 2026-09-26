variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type for backend nodes"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of backend EC2 instances to provision across private app subnets"
  type        = number
  default     = 2
}

variable "private_app_subnet_ids" {
  description = "List of private application subnet IDs (across 2 AZs)"
  type        = list(string)
}

variable "backend_security_group_id" {
  description = "Security group ID for the backend EC2 instances"
  type        = string
}

variable "log_group_name" {
  description = "CloudWatch log group for Docker container and host logging"
  type        = string
  default     = "/aws/ec2/inventory-api"
}

variable "tags" {
  description = "Tags to apply to all backend compute resources"
  type        = map(string)
  default     = {}
}
