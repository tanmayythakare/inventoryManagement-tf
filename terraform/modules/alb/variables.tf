variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "The VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security Group ID for the ALB"
  type        = string
}

variable "certificate_arn" {
  description = "The ARN of the ACM SSL certificate in ap-south-1 for the HTTPS listener"
  type        = string
  default     = ""
}

variable "target_instance_ids" {
  description = "List of backend EC2 instance IDs to register into the Target Group"
  type        = list(string)
  default     = []
}

variable "deregistration_delay" {
  description = "Time in seconds for connection draining before deregistration"
  type        = number
  default     = 15
}

variable "health_check_path" {
  description = "Path for the health check probe"
  type        = string
  default     = "/actuator/health"
}

variable "tags" {
  description = "Tags to attach to the ALB and associated resources"
  type        = map(string)
  default     = {}
}
