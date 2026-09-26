terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.50"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  alb_domain_name = "${var.alb_subdomain}.${var.domain_name}"
  cf_domain_name  = "${var.frontend_subdomain}.${var.domain_name}"
}

# ==============================================================================
# 1. ALB ACM Certificate in ap-south-1 (Default AWS Provider)
# ==============================================================================
resource "aws_acm_certificate" "alb" {
  domain_name       = local.alb_domain_name
  validation_method = "DNS"

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-alb-cert-ap-south-1"
      Service     = "ALB"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ==============================================================================
# 2. CloudFront ACM Certificate in us-east-1 (Aliased AWS Provider)
# ==============================================================================
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = local.cf_domain_name
  validation_method = "DNS"

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-cf-cert-us-east-1"
      Service     = "CloudFront"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ==============================================================================
# DNS Validation Records (Route 53 - Optional Automated Validation)
# ==============================================================================
resource "aws_route53_record" "alb_validation" {
  for_each = var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.alb.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_route53_record" "cf_validation" {
  for_each = var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "alb" {
  count                   = var.route53_zone_id != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.alb.arn
  validation_record_fqdns = [for record in aws_route53_record.alb_validation : record.fqdn]
}

resource "aws_acm_certificate_validation" "cloudfront" {
  count                   = var.route53_zone_id != "" ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cf_validation : record.fqdn]
}
