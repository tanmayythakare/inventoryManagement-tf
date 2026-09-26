output "instance_ids" {
  description = "List of EC2 instance IDs provisioned for the backend service"
  value       = aws_instance.backend[*].id
}

output "private_ips" {
  description = "List of private IP addresses of the backend EC2 instances"
  value       = aws_instance.backend[*].private_ip
}

output "iam_role_arn" {
  description = "ARN of the IAM role assigned to backend instances"
  value       = aws_iam_role.backend.arn
}

output "iam_instance_profile_name" {
  description = "Name of the IAM instance profile"
  value       = aws_iam_instance_profile.backend.name
}
