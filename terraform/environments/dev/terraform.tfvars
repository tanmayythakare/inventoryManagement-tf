aws_region           = "ap-south-1"
environment          = "dev"
project_name         = "pr-inventory"
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_app_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
isolated_db_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24"]

enable_multi_az_nat  = false
instance_type        = "t3.micro"
instance_count       = 2

rds_instance_class          = "db.t3.micro"
rds_allocated_storage       = 20
rds_deletion_protection     = false
rds_multi_az                = false
rds_backup_retention_period = 1
rds_skip_final_snapshot     = true

domain_name     = "dev.example.internal"
route53_zone_id = ""
alert_email     = "devops-dev-alerts@example.com"

tags = {
  Project     = "pr-inventory"
  Environment = "dev"
  ManagedBy   = "Terraform"
}
