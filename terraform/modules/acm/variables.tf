variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Root domain name for the application (e.g. example.com)"
  type        = string
  default     = "example.com"
}

variable "alb_subdomain" {
  description = "Subdomain prefix for the backend API ALB (e.g. api)"
  type        = string
  default     = "api"
}

variable "frontend_subdomain" {
  description = "Subdomain prefix for the CloudFront frontend CDN (e.g. app)"
  type        = string
  default     = "app"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for automated DNS validation (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to assign to ACM certificates"
  type        = map(string)
  default     = {}
}
