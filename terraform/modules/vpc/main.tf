locals {
  nat_gateway_count = var.enable_multi_az_nat ? 2 : 1
}

# ==============================================================================
# VPC
# ==============================================================================
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-vpc"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Internet Gateway
# ==============================================================================
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-igw"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Subnets (6 subnets across 2 Availability Zones)
# ==============================================================================

# 1. Public Subnets (ALB & NAT Gateways)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-public-${var.availability_zones[count.index]}"
      Tier        = "Public"
      Environment = var.environment
    }
  )
}

# 2. Private Application Subnets (Backend EC2 Instances)
resource "aws_subnet" "private_app" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_app_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-private-app-${var.availability_zones[count.index]}"
      Tier        = "Private-App"
      Environment = var.environment
    }
  )
}

# 3. Isolated Database Subnets (Amazon RDS PostgreSQL 16 - Zero Internet Access)
resource "aws_subnet" "isolated_db" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.isolated_db_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-isolated-db-${var.availability_zones[count.index]}"
      Tier        = "Isolated-DB"
      Environment = var.environment
    }
  )
}

# ==============================================================================
# Elastic IPs & NAT Gateways
# ==============================================================================
resource "aws_eip" "nat" {
  count  = local.nat_gateway_count
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-nat-eip-${count.index + 1}"
      Environment = var.environment
    }
  )
}

resource "aws_nat_gateway" "nat" {
  count         = local.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-nat-gw-${count.index + 1}"
      Environment = var.environment
    }
  )

  depends_on = [aws_internet_gateway.igw]
}

# ==============================================================================
# Route Tables & Routes
# ==============================================================================

# Public Route Table (Routes 0.0.0.0/0 to Internet Gateway)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-public-rt"
      Tier        = "Public"
      Environment = var.environment
    }
  )
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Application Route Tables (Routes 0.0.0.0/0 to NAT Gateway)
resource "aws_route_table" "private_app" {
  count  = local.nat_gateway_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-private-app-rt-${count.index + 1}"
      Tier        = "Private-App"
      Environment = var.environment
    }
  )
}

resource "aws_route_table_association" "private_app" {
  count          = 2
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = var.enable_multi_az_nat ? aws_route_table.private_app[count.index].id : aws_route_table.private_app[0].id
}

# Isolated Database Route Table (NO 0.0.0.0/0 route! Strictly local VPC routing)
resource "aws_route_table" "isolated_db" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-isolated-db-rt"
      Tier        = "Isolated-DB"
      Environment = var.environment
    }
  )
}

resource "aws_route_table_association" "isolated_db" {
  count          = 2
  subnet_id      = aws_subnet.isolated_db[count.index].id
  route_table_id = aws_route_table.isolated_db.id
}

# ==============================================================================
# VPC Flow Logs (CloudWatch)
# ==============================================================================
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/flow-logs-${var.environment}"
  retention_in_days = 30

  tags = merge(
    var.tags,
    {
      Name        = "${var.environment}-flow-logs"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.environment}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.environment}-vpc-flow-logs-policy"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_flow_log" "main" {
  count           = var.enable_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id
}
