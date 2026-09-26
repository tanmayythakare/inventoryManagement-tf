output "state_bucket_name" {
  description = "The name of the S3 bucket configured for Terraform remote state"
  value       = aws_s3_bucket.tfstate.id
}

output "state_bucket_arn" {
  description = "The ARN of the remote state S3 bucket"
  value       = aws_s3_bucket.tfstate.arn
}

output "jenkins_instance_id" {
  description = "EC2 Instance ID of the Jenkins runner"
  value       = aws_instance.jenkins.id
}

output "jenkins_public_ip" {
  description = "Public IP address of the Jenkins runner"
  value       = aws_eip.jenkins.public_ip
}

output "jenkins_ui_url" {
  description = "URL to access the Jenkins web dashboard"
  value       = "http://${aws_eip.jenkins.public_ip}:8080"
}

output "jenkins_iam_role_arn" {
  description = "IAM Role ARN attached to the Jenkins EC2 runner"
  value       = aws_iam_role.jenkins.arn
}

output "backend_config_hcl_snippet" {
  description = "Sample backend configuration block using native S3 state locking"
  value = <<-EOT
    terraform {
      backend "s3" {
        bucket       = "${aws_s3_bucket.tfstate.id}"
        key          = "environments/dev/terraform.tfstate"
        region       = "${var.aws_region}"
        encrypt      = true
        use_lockfile = true
      }
    }
  EOT
}
