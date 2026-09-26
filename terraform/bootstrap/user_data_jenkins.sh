#!/bin/bash
set -euo pipefail

# ==============================================================================
# Jenkins CI/CD Runner Bootstrap Script
# Target Host: Ubuntu 24.04 LTS on AWS EC2 (t3.micro, ap-south-1)
# Optimizations: 2GB Swap Memory (Prevents OOM during Maven/Docker/Trivy builds)
# Toolchain: Docker, Git, Java 21, Maven, Trivy, TruffleHog, Syft, Node.js 20, Terraform
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive
LOG_FILE="/var/log/jenkins_bootstrap.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=========================================================="
echo "Starting Jenkins EC2 Provisioning: $(date -u)"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 1. Memory Optimization: Configure 2GB Swap Space
# ------------------------------------------------------------------------------
if ! grep -q '/swapfile' /etc/fstab; then
  echo "[+] Step 1: Configuring 2GB virtual swap space on /swapfile..."
  if ! fallocate -l 2G /swapfile 2>/dev/null; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048
  fi
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # Set swappiness low (10) for burstable micro instances to avoid aggressive page swapping
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf

  # Tune VFS cache pressure
  sysctl vm.vfs_cache_pressure=50
  echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

  echo "[+] 2GB swap space successfully initialized."
  free -h
else
  echo "[*] Swap space already configured."
fi

# ------------------------------------------------------------------------------
# 2. Base Packages & System Update
# ------------------------------------------------------------------------------
echo "[+] Step 2: Updating package index and installing foundational utilities..."
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
  tar \
  jq \
  git

# ------------------------------------------------------------------------------
# 3. Install OpenJDK 21 & Apache Maven
# ------------------------------------------------------------------------------
echo "[+] Step 3: Installing OpenJDK 21 and Maven..."
apt-get install -y openjdk-21-jdk maven
java -version
mvn -version

# ------------------------------------------------------------------------------
# 4. Install Docker CE & Containerd
# ------------------------------------------------------------------------------
echo "[+] Step 4: Installing Docker Engine..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# Add default ubuntu user to docker group
usermod -aG docker ubuntu || true

# ------------------------------------------------------------------------------
# 5. Install Jenkins LTS
# ------------------------------------------------------------------------------
echo "[+] Step 5: Installing Jenkins LTS..."
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

apt-get update -y
apt-get install -y jenkins

# Grant Jenkins user access to docker socket
usermod -aG docker jenkins

# Optimize Jenkins JVM parameters for t3.micro with swap (512m max heap)
mkdir -p /etc/systemd/system/jenkins.service.d
cat << 'EOF' > /etc/systemd/system/jenkins.service.d/override.conf
[Service]
Environment="JAVA_OPTS=-Djava.awt.headless=true -Xms256m -Xmx512m -XX:+UseG1GC"
EOF

systemctl daemon-reload
systemctl enable jenkins
systemctl restart jenkins

# ------------------------------------------------------------------------------
# 6. Install AWS CLI v2
# ------------------------------------------------------------------------------
echo "[+] Step 6: Installing AWS CLI v2..."
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update
rm -rf /tmp/aws /tmp/awscliv2.zip
aws --version

# ------------------------------------------------------------------------------
# 7. Install Security Scanners: Trivy, TruffleHog, and Syft
# ------------------------------------------------------------------------------
echo "[+] Step 7: Installing Trivy (IaC and Container Vulnerability Scanner)..."
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/trivy.list
apt-get update -y
apt-get install -y trivy
trivy --version

echo "[+] Step 7b: Installing TruffleHog (Secret Scanner)..."
TRUFFLEHOG_VERSION="3.88.2"
curl -sSfL "https://github.com/trufflesecurity/trufflehog/releases/download/v${TRUFFLEHOG_VERSION}/trufflehog_${TRUFFLEHOG_VERSION}_linux_amd64.tar.gz" -o /tmp/trufflehog.tar.gz
tar -xzf /tmp/trufflehog.tar.gz -C /usr/local/bin/ trufflehog
chmod +x /usr/local/bin/trufflehog
rm -f /tmp/trufflehog.tar.gz
trufflehog --version || true

echo "[+] Step 7c: Installing Syft (CycloneDX SBOM Generator)..."
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
syft --version

# ------------------------------------------------------------------------------
# 8. Install Node.js 20 LTS & Angular CLI
# ------------------------------------------------------------------------------
echo "[+] Step 8: Installing Node.js 20 LTS and Angular CLI..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g @angular/cli
node -v
npm -v
ng version || true

# ------------------------------------------------------------------------------
# 9. Install Terraform 1.9+
# ------------------------------------------------------------------------------
echo "[+] Step 9: Installing Terraform CLI..."
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list
apt-get update -y
apt-get install -y terraform
terraform version

echo "=========================================================="
echo "Jenkins Runner Bootstrap COMPLETE: $(date -u)"
echo "Initial Jenkins Admin Password:"
cat /var/lib/jenkins/secrets/initialAdminPassword || echo "Pending initialization"
echo "=========================================================="
