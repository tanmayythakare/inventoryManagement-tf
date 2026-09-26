variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "pr-inventory"
}

variable "bucket_name_override" {
  description = "Optional override for S3 bucket name. If empty, a unique name is generated."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM Certificate ARN in us-east-1 for CloudFront (optional, falls back to default CloudFront cert)"
  type        = string
  default     = ""
}

variable "aliases" {
  description = "Custom domain aliases (CNAMEs) for CloudFront distribution (e.g. ['app.example.com'])"
  type        = list(string)
  default     = []
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Tags to assign to frontend CDN resources"
  type        = map(string)
  default     = {}
}
