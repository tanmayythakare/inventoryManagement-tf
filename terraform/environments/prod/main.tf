# ==============================================================================
# Providers Configuration (Dual-Region Architecture)
# ==============================================================================

# Primary provider for ap-south-1 (Mumbai)
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# Aliased provider for us-east-1 (N. Virginia) required for CloudFront ACM SSL
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = var.tags
  }
}

# ==============================================================================
# 1. VPC & Networking Module (6 subnets across 2 AZs, Multi-AZ NAT GWs in Prod)
# ==============================================================================
module "vpc" {
  source = "../../modules/vpc"

  environment               = var.environment
  vpc_cidr                  = var.vpc_cidr
  availability_zones        = var.availability_zones
  public_subnet_cidrs       = var.public_subnet_cidrs
  private_app_subnet_cidrs  = var.private_app_subnet_cidrs
  isolated_db_subnet_cidrs  = var.isolated_db_subnet_cidrs
  enable_multi_az_nat       = var.enable_multi_az_nat
  tags                      = var.tags
}

# ==============================================================================
# 2. Security Module (Least-Privilege Security Groups)
# ==============================================================================
module "security" {
  source = "../../modules/security"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  tags        = var.tags
}

# ==============================================================================
# 3. Dual-Region ACM SSL Certificates Module
# ==============================================================================
module "acm" {
  source = "../../modules/acm"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment     = var.environment
  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
  tags            = var.tags
}

# ==============================================================================
# 4. Observability Module (CloudWatch Logs, Metric Filter [ERROR], SNS Alarm)
# ==============================================================================
module "observability" {
  source = "../../modules/observability"

  environment    = var.environment
  log_group_name = "/aws/ec2/inventory-api"
  alert_email    = var.alert_email
  tags           = var.tags
}

# ==============================================================================
# 5. EC2 Backend Compute Module (Private App Subnets, 2GB Swap, Nginx :8080)
# ==============================================================================
module "ec2_backend" {
  source = "../../modules/ec2_backend"

  environment               = var.environment
  aws_region                = var.aws_region
  instance_type             = var.instance_type
  instance_count            = var.instance_count
  private_app_subnet_ids    = module.vpc.private_app_subnet_ids
  backend_security_group_id = module.security.backend_security_group_id
  log_group_name            = module.observability.log_group_name
  tags                      = var.tags
}

# ==============================================================================
# 6. Application Load Balancer Module (HTTP 80 -> 301 HTTPS 443, /actuator/health)
# ==============================================================================
module "alb" {
  source = "../../modules/alb"

  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  certificate_arn       = module.acm.alb_certificate_arn
  target_instance_ids   = module.ec2_backend.instance_ids
  tags                  = var.tags
}

# ==============================================================================
# 7. Amazon RDS PostgreSQL 16 Module (Multi-AZ HA, Deletion Protection, 50GB gp3)
# ==============================================================================
module "rds" {
  source = "../../modules/rds"

  environment             = var.environment
  isolated_db_subnet_ids  = module.vpc.isolated_db_subnet_ids
  rds_security_group_id   = module.security.rds_security_group_id
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  deletion_protection     = var.rds_deletion_protection
  multi_az                = var.rds_multi_az
  backup_retention_period = var.rds_backup_retention_period
  skip_final_snapshot     = var.rds_skip_final_snapshot
  tags                    = var.tags
}

# ==============================================================================
# 8. S3 & CloudFront Frontend Module (OAC, SPA 403/404 -> /index.html)
# ==============================================================================
module "s3_cloudfront_frontend" {
  source = "../../modules/s3_cloudfront_frontend"

  environment         = var.environment
  project_name        = var.project_name
  acm_certificate_arn = module.acm.cloudfront_certificate_arn
  aliases             = var.route53_zone_id != "" ? ["app.${var.domain_name}"] : []
  tags                = var.tags
}
