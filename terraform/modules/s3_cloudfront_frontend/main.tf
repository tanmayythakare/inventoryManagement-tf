data "aws_caller_identity" "current" {}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

locals {
  account_id  = data.aws_caller_identity.current.account_id
  bucket_name = var.bucket_name_override != "" ? var.bucket_name_override : "${var.project_name}-frontend-${var.environment}-${local.account_id}"
  s3_origin_id = "S3-${local.bucket_name}"
}

# ==============================================================================
# S3 Static Website Storage Bucket (Private, Encrypted, OAC Protected)
# ==============================================================================
resource "aws_s3_bucket" "frontend" {
  bucket        = local.bucket_name
  force_destroy = var.environment != "prod"

  tags = merge(
    var.tags,
    {
      Name        = local.bucket_name
      Environment = var.environment
      Purpose     = "Angular-18-Static-SPA"
    }
  )
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# ==============================================================================
# CloudFront Origin Access Control (OAC)
# ==============================================================================
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.environment}-frontend-oac"
  description                       = "OAC for ${var.environment} Angular frontend S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ==============================================================================
# CloudFront Distribution
# ==============================================================================
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} Angular 18 Frontend CDN"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = var.acm_certificate_arn != "" ? var.aliases : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # ----------------------------------------------------------------------------
  # SPA Routing Error Fallback Rules (HTML5 PushState: /login, /dashboard, /orders)
  # ----------------------------------------------------------------------------
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-frontend-cdn"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# S3 Bucket Policy (Enforce Read Access Strictly via CloudFront OAC)
# ==============================================================================
resource "aws_s3_bucket_policy" "frontend_oac_policy" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOACReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}
