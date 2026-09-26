output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "Private application subnet IDs"
  value       = module.vpc.private_app_subnet_ids
}

output "isolated_db_subnet_ids" {
  description = "Isolated database subnet IDs"
  value       = module.vpc.isolated_db_subnet_ids
}

output "nat_gateway_ids" {
  description = "List of Multi-AZ NAT Gateway IDs"
  value       = module.vpc.nat_gateway_ids
}

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

output "target_group_arn" {
  description = "ARN of the backend Target Group (for deploy-backend.sh)"
  value       = module.alb.target_group_arn
}

output "backend_instance_ids" {
  description = "EC2 Instance IDs of the private backend nodes"
  value       = module.ec2_backend.instance_ids
}

output "backend_private_ips" {
  description = "Private IP addresses of backend EC2 nodes"
  value       = module.ec2_backend.private_ips
}

output "rds_endpoint" {
  description = "Amazon RDS PostgreSQL connection endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "Amazon RDS PostgreSQL host address"
  value       = module.rds.db_instance_address
}

output "rds_database_name" {
  description = "Default database name"
  value       = module.rds.db_name
}

output "frontend_s3_bucket" {
  description = "S3 bucket name hosting the compiled Angular 18 assets"
  value       = module.s3_cloudfront_frontend.s3_bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation in deploy-frontend.sh)"
  value       = module.s3_cloudfront_frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront CDN domain name"
  value       = module.s3_cloudfront_frontend.cloudfront_domain_name
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name for backend containers"
  value       = module.observability.log_group_name
}

output "sns_alert_topic_arn" {
  description = "Amazon SNS alert topic ARN"
  value       = module.observability.sns_topic_arn
}
