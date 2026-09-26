variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "log_group_name" {
  description = "Name of the CloudWatch Log Group for backend application logging"
  type        = string
  default     = "/aws/ec2/inventory-api"
}

variable "retention_in_days" {
  description = "Retention period for logs in days"
  type        = number
  default     = 30
}

variable "alert_email" {
  description = "Email address to receive high-priority SNS alert notifications"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to assign to observability resources"
  type        = map(string)
  default     = {}
}
