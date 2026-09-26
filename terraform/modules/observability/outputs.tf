output "log_group_name" {
  description = "The name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.backend.name
}

output "log_group_arn" {
  description = "The ARN of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.backend.arn
}

output "sns_topic_arn" {
  description = "The ARN of the SNS alert topic"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "The name of the SNS alert topic"
  value       = aws_sns_topic.alerts.name
}

output "alarm_arn" {
  description = "The ARN of the CloudWatch error rate alarm"
  value       = aws_cloudwatch_metric_alarm.backend_errors.arn
}

output "alarm_name" {
  description = "The name of the CloudWatch error rate alarm"
  value       = aws_cloudwatch_metric_alarm.backend_errors.alarm_name
}
