#!/bin/bash
set -euo pipefail

# ==============================================================================
# Backend EC2 Instance User-Data Provisioning
# Target: Ubuntu 24.04 LTS (t3.micro in private application subnet)
# Egress: Via NAT Gateway (No public IP)
# Features: 2GB Swap Memory, Docker CE, Local Nginx Reverse Proxy (:8080)
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive
LOG_FILE="/var/log/backend_bootstrap.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=========================================================="
echo "Starting Backend EC2 Host Provisioning: $(date -u)"
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${AWS_REGION}"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 1. Configure 2GB Swap Space
# ------------------------------------------------------------------------------
if ! grep -q '/swapfile' /etc/fstab; then
  echo "[+] Configuring 2GB virtual swap space on /swapfile..."
  if ! fallocate -l 2G /swapfile 2>/dev/null; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048
  fi
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # Optimize Linux VM swappiness for burstable micro instances
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl vm.vfs_cache_pressure=50
  echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

  echo "[+] 2GB swap space initialized."
  free -h
else
  echo "[*] Swap space already present."
fi

# ------------------------------------------------------------------------------
# 2. Base Utilities Update
# ------------------------------------------------------------------------------
echo "[+] Updating package repositories..."
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  wget \
  gnupg \
  lsb-release \
  apt-transport-https \
  software-properties-common \
  unzip \
  jq \
  nginx

# ------------------------------------------------------------------------------
# 3. Install Docker Engine
# ------------------------------------------------------------------------------
echo "[+] Installing Docker Engine..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure Docker daemon logging to CloudWatch
mkdir -p /etc/docker
cat << 'EOF' > /etc/docker/daemon.json
{
  "log-driver": "awslogs",
  "log-opts": {
    "awslogs-region": "${AWS_REGION}",
    "awslogs-group": "${LOG_GROUP_NAME}",
    "awslogs-create-group": "true"
  }
}
EOF

systemctl enable docker
systemctl restart docker
usermod -aG docker ubuntu || true

# ------------------------------------------------------------------------------
# 4. Install AWS CLI v2
# ------------------------------------------------------------------------------
echo "[+] Installing AWS CLI v2..."
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update
rm -rf /tmp/aws /tmp/awscliv2.zip
aws --version

# ------------------------------------------------------------------------------
# 5. Configure Local Nginx Reverse Proxy on Port 8080
# ------------------------------------------------------------------------------
echo "[+] Configuring Nginx reverse proxy on port 8080..."
# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

cat << 'EOF' > /etc/nginx/conf.d/upstream.conf
upstream backend_pool {
    server 127.0.0.1:8081; # Default initial Blue slot
}

server {
    listen 8080 default_server;
    server_name _;

    client_max_body_size 25M;

    location / {
        proxy_pass http://backend_pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /nginx_health {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

# Create state directory for blue/green deployment tracking
mkdir -p /var/run/inventory-api
echo "blue" > /var/run/inventory-api/active_color

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=========================================================="
echo "Backend Host Provisioning COMPLETE: $(date -u)"
echo "Nginx listening on port 8080 forwarding to 127.0.0.1:8081"
echo "=========================================================="
