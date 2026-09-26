variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "The VPC ID where security groups will be provisioned"
  type        = string
}

variable "alb_ingress_cidrs" {
  description = "CIDR blocks permitted to reach ALB on ports 80/443"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "jenkins_allowed_cidrs" {
  description = "CIDR blocks permitted to access Jenkins Web UI on port 8080"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Tags to attach to security groups"
  type        = map(string)
  default     = {}
}
