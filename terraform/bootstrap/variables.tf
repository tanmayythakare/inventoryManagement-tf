variable "aws_region" {
  description = "The AWS region to deploy the bootstrap infrastructure into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project identifier prefix for resources"
  type        = string
  default     = "pr-inventory"
}

variable "environment" {
  description = "Environment identifier (e.g., bootstrap, dev, staging, prod)"
  type        = string
  default     = "bootstrap"
}

variable "state_bucket_name_override" {
  description = "Optional explicit bucket name for Terraform remote state. If omitted, a name will be derived from project, region, and account ID."
  type        = string
  default     = ""
}

variable "jenkins_instance_type" {
  description = "EC2 instance type for the Jenkins runner"
  type        = string
  default     = "t3.micro"
}

variable "jenkins_allowed_cidr_blocks" {
  description = "CIDR blocks permitted to access Jenkins Web UI on port 8080"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "jenkins_ssh_allowed_cidr_blocks" {
  description = "CIDR blocks permitted to access SSH on port 22 (leave empty to rely solely on AWS SSM)"
  type        = list(string)
  default     = []
}

variable "vpc_id" {
  description = "Optional VPC ID where Jenkins should be deployed. Defaults to default VPC if not provided."
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Optional subnet ID where Jenkins should be deployed. Defaults to first subnet in VPC if not provided."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default = {
    Project     = "pr-inventory"
    ManagedBy   = "Terraform"
    Environment = "bootstrap"
  }
}
