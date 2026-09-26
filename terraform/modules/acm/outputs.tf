output "alb_certificate_arn" {
  description = "ARN of the ACM certificate in ap-south-1 for the Application Load Balancer"
  value       = aws_acm_certificate.alb.arn
}

output "cloudfront_certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 for the CloudFront CDN distribution"
  value       = aws_acm_certificate.cloudfront.arn
}

output "alb_certificate_status" {
  description = "Validation status of the ALB certificate"
  value       = aws_acm_certificate.alb.status
}

output "cloudfront_certificate_status" {
  description = "Validation status of the CloudFront certificate"
  value       = aws_acm_certificate.cloudfront.status
}

output "alb_domain_validation_options" {
  description = "Domain validation options for the ALB certificate"
  value       = aws_acm_certificate.alb.domain_validation_options
}

output "cloudfront_domain_validation_options" {
  description = "Domain validation options for the CloudFront certificate"
  value       = aws_acm_certificate.cloudfront.domain_validation_options
}
