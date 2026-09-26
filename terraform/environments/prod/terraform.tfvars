aws_region           = "ap-south-1"
environment          = "prod"
project_name         = "pr-inventory"
vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24"]
private_app_subnet_cidrs = ["10.2.11.0/24", "10.2.12.0/24"]
isolated_db_subnet_cidrs = ["10.2.21.0/24", "10.2.22.0/24"]

enable_multi_az_nat  = true
instance_type        = "t3.micro"
instance_count       = 2

rds_instance_class          = "db.t3.micro"
rds_allocated_storage       = 50
rds_deletion_protection     = true
rds_multi_az                = true
rds_backup_retention_period = 30
rds_skip_final_snapshot     = false

domain_name     = "example.com"
route53_zone_id = ""
alert_email     = "devops-prod-alerts@example.com"

tags = {
  Project     = "pr-inventory"
  Environment = "prod"
  ManagedBy   = "Terraform"
}
