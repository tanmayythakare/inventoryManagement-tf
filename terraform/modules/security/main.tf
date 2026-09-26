# ==============================================================================
# Security Groups (Least-Privilege Defense in Depth)
# ==============================================================================

# 1. Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Controls public ingress to Application Load Balancer"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-alb-sg"
      Tier        = "ALB"
      Environment = var.environment
    }
  )
}

resource "aws_security_group_rule" "alb_http_ingress" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  description       = "Public HTTP ingress for 301 redirection to HTTPS"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = var.alb_ingress_cidrs
}

resource "aws_security_group_rule" "alb_https_ingress" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  description       = "Public HTTPS ingress for encrypted client traffic"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.alb_ingress_cidrs
}

resource "aws_security_group_rule" "alb_to_backend_egress" {
  type                     = "egress"
  security_group_id        = aws_security_group.alb.id
  description              = "Forward traffic to backend EC2 instances on port 8080"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
}

# 2. Backend EC2 Application Security Group
resource "aws_security_group" "backend" {
  name        = "${var.environment}-backend-app-sg"
  description = "Controls ingress and egress for private backend EC2 instances"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-backend-app-sg"
      Tier        = "Private-App"
      Environment = var.environment
    }
  )
}

resource "aws_security_group_rule" "backend_ingress_from_alb" {
  type                     = "ingress"
  security_group_id        = aws_security_group.backend.id
  description              = "Allow traffic from ALB on port 8080 only"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "backend_egress_to_rds" {
  type                     = "egress"
  security_group_id        = aws_security_group.backend.id
  description              = "Allow outbound PostgreSQL connection to RDS on port 5432"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rds.id
}

resource "aws_security_group_rule" "backend_egress_https" {
  type              = "egress"
  security_group_id = aws_security_group.backend.id
  description       = "Allow outbound HTTPS via NAT Gateway for AWS APIs, SSM, ECR, CloudWatch"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "backend_egress_http" {
  type              = "egress"
  security_group_id = aws_security_group.backend.id
  description       = "Allow outbound HTTP via NAT Gateway for OS package repositories"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

# 3. Amazon RDS PostgreSQL Security Group
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-db-sg"
  description = "Controls ingress to Amazon RDS PostgreSQL 16 database"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-rds-db-sg"
      Tier        = "Isolated-DB"
      Environment = var.environment
    }
  )
}

resource "aws_security_group_rule" "rds_ingress_from_backend" {
  type                     = "ingress"
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access strictly from backend EC2 security group"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
}

# RDS has zero egress rules (never initiates outbound traffic)

# 4. Jenkins Runner Security Group
resource "aws_security_group" "jenkins" {
  name        = "${var.environment}-jenkins-runner-sg"
  description = "Controls access to the Jenkins CI/CD runner"
  vpc_id      = var.vpc_id

  ingress {
    description = "Jenkins Web UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = var.jenkins_allowed_cidrs
  }

  egress {
    description = "Outbound internet access for builds, package downloads, and deployments"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-jenkins-runner-sg"
      Tier        = "Management"
      Environment = var.environment
    }
  )
}
