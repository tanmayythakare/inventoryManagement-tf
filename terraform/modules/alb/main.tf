# ==============================================================================
# Application Load Balancer
# ==============================================================================
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
  drop_invalid_header_fields = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-alb"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Target Group (/actuator/health on port 8080)
# ==============================================================================
resource "aws_lb_target_group" "backend" {
  name                 = "${var.environment}-backend-tg"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = var.deregistration_delay

  health_check {
    enabled             = true
    path                = var.health_check_path
    protocol            = "HTTP"
    port                = "traffic-port"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-backend-tg"
      Environment = var.environment
    }
  )
}

# Target Group Attachment for Backend EC2 Nodes
resource "aws_lb_target_group_attachment" "backend_instances" {
  count            = length(var.target_instance_ids)
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = var.target_instance_ids[count.index]
  port             = 8080
}

# ==============================================================================
# Port 80 HTTP Listener (Strict HTTP 301 Redirect to Port 443 HTTPS)
# ==============================================================================
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ==============================================================================
# Port 443 HTTPS Listener (Dual-Region ACM Certificate ap-south-1)
# ==============================================================================
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
