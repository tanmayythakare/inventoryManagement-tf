# ==============================================================================
# CloudWatch Log Group (/aws/ec2/inventory-api)
# ==============================================================================
resource "aws_cloudwatch_log_group" "backend" {
  name              = var.log_group_name
  retention_in_days = var.retention_in_days

  tags = merge(
    var.tags,
    {
      Name        = var.log_group_name
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Metric Filter: Capturing Spring Boot [ERROR] Log Events
# ==============================================================================
resource "aws_cloudwatch_log_metric_filter" "backend_errors" {
  name           = "${var.environment}-backend-errors-filter"
  pattern        = "\"[ERROR]\""
  log_group_name = aws_cloudwatch_log_group.backend.name

  metric_transformation {
    name          = "BackendErrorCount"
    namespace     = "InventoryApp/Backend"
    value         = "1"
    default_value = 0
  }
}

# ==============================================================================
# Amazon SNS Topic & Alert Subscriptions
# ==============================================================================
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-devops-alerts"

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-devops-alerts"
      Environment = var.environment
    }
  )
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ==============================================================================
# CloudWatch Metric Alarm for Backend Errors
# ==============================================================================
resource "aws_cloudwatch_metric_alarm" "backend_errors" {
  alarm_name          = "${var.environment}-inventory-api-error-rate"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "BackendErrorCount"
  namespace           = "InventoryApp/Backend"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when >= 1 [ERROR] log event is observed in ${var.log_group_name} over a 5 minute period"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-backend-error-alarm"
      Environment = var.environment
    }
  )
}
