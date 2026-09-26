aws_region           = "ap-south-1"
environment          = "staging"
project_name         = "pr-inventory"
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
private_app_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24"]
isolated_db_subnet_cidrs = ["10.1.21.0/24", "10.1.22.0/24"]

enable_multi_az_nat  = false
instance_type        = "t3.micro"
instance_count       = 2

rds_instance_class          = "db.t3.micro"
rds_allocated_storage       = 20
rds_deletion_protection     = true
rds_multi_az                = false
rds_backup_retention_period = 7
rds_skip_final_snapshot     = false

domain_name     = "staging.example.internal"
route53_zone_id = ""
alert_email     = "devops-staging-alerts@example.com"

tags = {
  Project     = "pr-inventory"
  Environment = "staging"
  ManagedBy   = "Terraform"
}
