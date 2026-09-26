data "aws_caller_identity" "current" {}

data "aws_ami" "ubuntu_24_04" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ==============================================================================
# IAM Role and Instance Profile (Least-Privilege: SSM, ECR, CloudWatch, SSM Params)
# ==============================================================================
resource "aws_iam_role" "backend" {
  name = "${var.environment}-backend-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-backend-ec2-role"
      Environment = var.environment
    }
  )
}

# SSM Managed Instance Core for agentless management without inbound SSH
resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Fine-grained permissions for ECR pulls, CloudWatch log streams, and SSM parameter access
resource "aws_iam_role_policy" "backend_policy" {
  name = "${var.environment}-backend-runtime-policy"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRImagePulling"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogging"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${var.log_group_name}*"
      },
      {
        Sid    = "SSMParameterStoreReadWrite"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/inventory-api/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "backend" {
  name = "${var.environment}-backend-instance-profile"
  role = aws_iam_role.backend.name
}

# ==============================================================================
# Backend EC2 Instances in Private Subnets (No Public IP)
# ==============================================================================
resource "aws_instance" "backend" {
  count                  = var.instance_count
  ami                    = data.aws_ami.ubuntu_24_04.id
  instance_type          = var.instance_type
  subnet_id              = var.private_app_subnet_ids[count.index % length(var.private_app_subnet_ids)]
  vpc_security_group_ids = [var.backend_security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.backend.name

  # Crucial Architecture Constraint: EC2 instances must NOT possess public IP addresses
  associate_public_ip_address = false
  user_data_replace_on_change = true

  user_data = templatefile("${path.module}/templates/user_data_backend.sh", {
    ENVIRONMENT    = var.environment
    AWS_REGION     = var.aws_region
    LOG_GROUP_NAME = var.log_group_name
  })

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-backend-node-${count.index + 1}"
      Role        = "Backend-API"
      Environment = var.environment
      Tier        = "Private-App"
    }
  )

  lifecycle {
    ignore_changes = [ami]
  }
}
