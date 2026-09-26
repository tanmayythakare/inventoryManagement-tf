output "alb_security_group_id" {
  description = "Security Group ID of the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "backend_security_group_id" {
  description = "Security Group ID of the Backend EC2 application instances"
  value       = aws_security_group.backend.id
}

output "rds_security_group_id" {
  description = "Security Group ID of the Amazon RDS PostgreSQL instance"
  value       = aws_security_group.rds.id
}

output "jenkins_security_group_id" {
  description = "Security Group ID of the Jenkins runner"
  value       = aws_security_group.jenkins.id
}
