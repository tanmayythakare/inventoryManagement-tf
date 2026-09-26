#!/usr/bin/env bash
# ==============================================================================
# Script: scripts/deploy-backend.sh
# Purpose: Synchronous SSM Rolling Blue/Green Deployment across EC2 instances
# Architecture:
#   1. Discovers backend EC2 instances in ALB Target Group.
#   2. Sequentially executes rolling update per instance:
#      a. Deregisters instance from ALB Target Group.
#      b. Waits 15s for in-flight HTTP connection draining.
#      c. Dispatches SSM Run Command executing local Blue/Green port swap:
#         - Detects active slot (8081 Blue / 8082 Green) via active_color or docker ps.
#         - Pulls new image from ECR.
#         - Runs container on standby port with awslogs driver.
#         - Probes http://127.0.0.1:<standby-port>/actuator/health until UP (up to 30x).
#         - If probe fails: stops standby container, keeps active online, exits 1.
#         - If healthy: atomically updates /etc/nginx/conf.d/upstream.conf & reloads Nginx.
#         - Stops previous active container.
#         - Updates SSM Parameter Store image tags.
#      d. Synchronously polls SSM command status until Success (or Failed/TimedOut).
#      e. Re-registers instance into ALB Target Group.
#      f. Polls ALB target health until healthy before proceeding to next instance.
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 1. Parameter Validation & Configuration
# ------------------------------------------------------------------------------
usage() {
  cat << 'EOF'
Usage: deploy-backend.sh <TARGET_GROUP_ARN> <IMAGE_TAG> [AWS_REGION] [ECR_REGISTRY] [ENVIRONMENT]

Parameters:
  TARGET_GROUP_ARN : AWS ALB Target Group ARN (required)
  IMAGE_TAG        : Docker image tag or full URI (e.g. v1.0.2 or inventory-api:v1.0.2) (required)
  AWS_REGION       : AWS Region (default: ap-south-1)
  ECR_REGISTRY     : AWS ECR Registry URL (optional if IMAGE_TAG is full URI)
  ENVIRONMENT      : Environment name (default: prod)

Options:
  -h, --help       : Display this help message
EOF
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

if [[ $# -lt 2 ]]; then
  echo "[-] ERROR: Missing required arguments." >&2
  usage
fi

TARGET_GROUP_ARN="${1:?Target Group ARN required}"
IMAGE_TAG="${2:?Docker image tag required}"
AWS_REGION="${3:-ap-south-1}"
ECR_REGISTRY="${4:-}"
ENVIRONMENT="${5:-prod}"

# Resolve full image URI
if [[ "${IMAGE_TAG}" == *"/"* ]]; then
  FULL_IMAGE="${IMAGE_TAG}"
elif [[ -n "${ECR_REGISTRY}" ]]; then
  if [[ "${IMAGE_TAG}" == inventory-api:* ]]; then
    FULL_IMAGE="${ECR_REGISTRY}/${IMAGE_TAG}"
  else
    FULL_IMAGE="${ECR_REGISTRY}/inventory-api:${IMAGE_TAG}"
  fi
else
  FULL_IMAGE="${IMAGE_TAG}"
fi

echo "=========================================================="
echo "Starting Synchronous Zero-Downtime Backend Rolling Deploy"
echo "Target Group: ${TARGET_GROUP_ARN}"
echo "Image Tag   : ${IMAGE_TAG}"
echo "Full Image  : ${FULL_IMAGE}"
echo "Region      : ${AWS_REGION}"
echo "Environment : ${ENVIRONMENT}"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 2. Discover Target EC2 Instances in ALB Target Group
# ------------------------------------------------------------------------------
echo "[+] Discovering target instances in Target Group..."
INSTANCE_IDS=$(aws elbv2 describe-target-health \
  --target-group-arn "${TARGET_GROUP_ARN}" \
  --region "${AWS_REGION}" \
  --query "TargetHealthDescriptions[*].Target.Id" \
  --output text 2>/dev/null || echo "")

if [[ -z "${INSTANCE_IDS}" || "${INSTANCE_IDS}" == "None" ]]; then
  echo "[-] ERROR: No target instances found registered in Target Group: ${TARGET_GROUP_ARN}" >&2
  exit 1
fi

echo "[+] Discovered target instance(s): ${INSTANCE_IDS}"

# ------------------------------------------------------------------------------
# 3. Rolling Deployment Loop (One Node at a Time)
# ------------------------------------------------------------------------------
for INSTANCE_ID in ${INSTANCE_IDS}; do
  echo "----------------------------------------------------------"
  echo "[+] Processing Node: ${INSTANCE_ID}"
  echo "----------------------------------------------------------"

  # Step A: Deregister target from ALB Target Group
  echo "[+] Step A: Deregistering ${INSTANCE_ID} from ALB Target Group..."
  aws elbv2 deregister-targets \
    --target-group-arn "${TARGET_GROUP_ARN}" \
    --targets Id="${INSTANCE_ID}" \
    --region "${AWS_REGION}"

  # Step B: 15 seconds Connection Draining Wait
  echo "[+] Step B: Waiting 15 seconds for in-flight connection draining..."
  sleep 15

  # Step C: Dispatch AWS SSM Run Command for Local Blue/Green Swap
  echo "[+] Step C: Dispatching local Blue/Green port swap via AWS Systems Manager..."

  SSM_COMMAND_ID=$(aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --comment "Rolling deploy ${IMAGE_TAG} to ${INSTANCE_ID}" \
    --region "${AWS_REGION}" \
    --parameters commands="[
      \"#!/bin/bash\",
      \"set -euo pipefail\",
      \"echo '[+] Determining active and standby slots...'\",
      \"ACTIVE_PORT=8081\",
      \"STANDBY_PORT=8082\",
      \"ACTIVE_SLOT='blue'\",
      \"STANDBY_SLOT='green'\",
      \"if [ -f /var/run/inventory-api/active_color ]; then\",
      \"  CURRENT_COLOR=\\\$(cat /var/run/inventory-api/active_color)\",
      \"  if [ \\\"\\\${CURRENT_COLOR}\\\" = 'green' ]; then\",
      \"    ACTIVE_PORT=8082; STANDBY_PORT=8081; ACTIVE_SLOT='green'; STANDBY_SLOT='blue'\",
      \"  fi\",
      \"elif docker ps --format '{{.Names}}' | grep -q 'inventory-api-green'; then\",
      \"  ACTIVE_PORT=8082; STANDBY_PORT=8081; ACTIVE_SLOT='green'; STANDBY_SLOT='blue'\",
      \"fi\",
      \"echo '[+] Active Slot: ' \\\${ACTIVE_SLOT} ' (port ' \\\${ACTIVE_PORT} ')'\",
      \"echo '[+] Standby Slot: ' \\\${STANDBY_SLOT} ' (port ' \\\${STANDBY_PORT} ')'\",
      \"if [ -n \\\"${ECR_REGISTRY}\\\" ]; then\",
      \"  echo '[+] Authenticating with ECR...'\",
      \"  aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}\",
      \"fi\",
      \"echo '[+] Pulling image ${FULL_IMAGE}...'\",
      \"docker pull ${FULL_IMAGE}\",
      \"echo '[+] Removing any stale standby container...'\",
      \"docker rm -f inventory-api-\\\${STANDBY_SLOT} 2>/dev/null || true\",
      \"echo '[+] Retrieving configuration from SSM Parameter Store...'\",
      \"DB_HOST=\\\$(aws ssm get-parameter --name '/inventory-api/${ENVIRONMENT}/db_host' --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || aws ssm get-parameter --name '/inventory-api/db_host' --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || echo 'localhost')\",
      \"DB_PASSWORD=\\\$(aws ssm get-parameter --name '/inventory-api/${ENVIRONMENT}/db_password' --with-decryption --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || aws ssm get-parameter --name '/inventory-api/db_password' --with-decryption --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || echo '')\",
      \"echo '[+] Launching standby container on port ' \\\${STANDBY_PORT} '...'\",
      \"docker run -d --name inventory-api-\\\${STANDBY_SLOT} -p \\\${STANDBY_PORT}:8080 --restart unless-stopped --log-driver=awslogs --log-opt awslogs-region=${AWS_REGION} --log-opt awslogs-group=/aws/ec2/inventory-api --log-opt awslogs-stream=inventory-api-\\\${STANDBY_SLOT}-\\\$(hostname) -e SPRING_PROFILES_ACTIVE=${ENVIRONMENT} -e DB_HOST=\\\${DB_HOST} -e DB_PASSWORD=\\\${DB_PASSWORD} ${FULL_IMAGE} || docker run -d --name inventory-api-\\\${STANDBY_SLOT} -p \\\${STANDBY_PORT}:8080 --restart unless-stopped -e SPRING_PROFILES_ACTIVE=${ENVIRONMENT} -e DB_HOST=\\\${DB_HOST} -e DB_PASSWORD=\\\${DB_PASSWORD} ${FULL_IMAGE}\",
      \"echo '[+] Probing health endpoint on standby port ' \\\${STANDBY_PORT} '...'\",
      \"HEALTHY=0\",
      \"for i in \\\$(seq 1 30); do\",
      \"  STATUS=\\\$(curl -s -f -m 2 http://127.0.0.1:\\\${STANDBY_PORT}/actuator/health 2>/dev/null | grep -o '\\\"status\\\":\\\"UP\\\"' || true)\",
      \"  if [ -n \\\"\\\${STATUS}\\\" ]; then\",
      \"    echo '[+] Standby container reported healthy UP after ' \\\${i} ' attempts.'\",
      \"    HEALTHY=1; break\",
      \"  fi\",
      \"  echo '[-] Health check probe attempt ' \\\${i} '/30 pending... sleeping 2s'\",
      \"  sleep 2\",
      \"done\",
      \"if [ \\\${HEALTHY} -ne 1 ]; then\",
      \"  echo '[-] CRITICAL: Standby container failed health checks! Aborting without switching traffic.'\",
      \"  docker stop inventory-api-\\\${STANDBY_SLOT} 2>/dev/null || true\",
      \"  docker rm -f inventory-api-\\\${STANDBY_SLOT} 2>/dev/null || true\",
      \"  exit 1\",
      \"fi\",
      \"echo '[+] Atomically switching Nginx upstream to port ' \\\${STANDBY_PORT} '...'\",
      \"echo \\\"upstream backend_pool { server 127.0.0.1:\\\${STANDBY_PORT}; }\\\" > /etc/nginx/conf.d/upstream.conf\",
      \"nginx -t && nginx -s reload\",
      \"mkdir -p /var/run/inventory-api\",
      \"echo \\\${STANDBY_SLOT} > /var/run/inventory-api/active_color\",
      \"echo '[+] Stopping old active container: inventory-api-' \\\${ACTIVE_SLOT} '...'\",
      \"docker stop inventory-api-\\\${ACTIVE_SLOT} 2>/dev/null || true\",
      \"docker rm -f inventory-api-\\\${ACTIVE_SLOT} 2>/dev/null || true\",
      \"echo '[+] Updating SSM Parameter Store image tags...'\",
      \"CURR_TAG=\\\$(aws ssm get-parameter --name '/inventory-api/${ENVIRONMENT}/current_image_tag' --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || aws ssm get-parameter --name '/inventory-api/current_image_tag' --query 'Parameter.Value' --output text --region '${AWS_REGION}' 2>/dev/null || echo '')\",
      \"if [ -n \\\"\\\${CURR_TAG}\\\" ] && [ \\\"\\\${CURR_TAG}\\\" != 'none' ]; then\",
      \"  aws ssm put-parameter --name '/inventory-api/${ENVIRONMENT}/previous_image_tag' --value \\\"\\\${CURR_TAG}\\\" --type String --overwrite --region '${AWS_REGION}' 2>/dev/null || true\",
      \"  aws ssm put-parameter --name '/inventory-api/previous_image_tag' --value \\\"\\\${CURR_TAG}\\\" --type String --overwrite --region '${AWS_REGION}' 2>/dev/null || true\",
      \"fi\",
      \"aws ssm put-parameter --name '/inventory-api/${ENVIRONMENT}/current_image_tag' --value '${IMAGE_TAG}' --type String --overwrite --region '${AWS_REGION}' 2>/dev/null || true\",
      \"aws ssm put-parameter --name '/inventory-api/current_image_tag' --value '${IMAGE_TAG}' --type String --overwrite --region '${AWS_REGION}' 2>/dev/null || true\",
      \"echo '[+] Local Blue/Green swap completed successfully.'\"
    ]" \
    --query "Command.CommandId" \
    --output text)

  echo "[+] SSM Command dispatched. Command ID: ${SSM_COMMAND_ID}"

  # Step D: Synchronously Poll SSM Command Status until terminal state
  echo "[+] Step D: Synchronously polling SSM Command execution status..."
  while true; do
    CMD_STATUS=$(aws ssm get-command-invocation \
      --command-id "${SSM_COMMAND_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --region "${AWS_REGION}" \
      --query "Status" \
      --output text 2>/dev/null || echo "Pending")

    echo "[*] SSM Status on ${INSTANCE_ID}: ${CMD_STATUS}"

    if [[ "${CMD_STATUS}" == "Success" ]]; then
      echo "[+] SSM Command succeeded on ${INSTANCE_ID}."
      break
    elif [[ "${CMD_STATUS}" == "Failed" || "${CMD_STATUS}" == "TimedOut" || "${CMD_STATUS}" == "Cancelled" ]]; then
      echo "[-] CRITICAL: SSM Command failed on ${INSTANCE_ID} with status: ${CMD_STATUS}" >&2
      STDERR=$(aws ssm get-command-invocation \
        --command-id "${SSM_COMMAND_ID}" \
        --instance-id "${INSTANCE_ID}" \
        --region "${AWS_REGION}" \
        --query "StandardErrorContent" \
        --output text 2>/dev/null || echo "No stderr output captured")
      echo "[-] Stderr from ${INSTANCE_ID}:" >&2
      echo "${STDERR}" >&2

      # Re-register node back into ALB Target Group to restore capacity (TC-B28-02)
      echo "[!] Re-registering ${INSTANCE_ID} into ALB Target Group to restore capacity..."
      aws elbv2 register-targets \
        --target-group-arn "${TARGET_GROUP_ARN}" \
        --targets Id="${INSTANCE_ID}" \
        --region "${AWS_REGION}" 2>/dev/null || true
      exit 1
    fi

    sleep 3
  done

  # Step E: Re-register target into ALB Target Group
  echo "[+] Step E: Re-registering ${INSTANCE_ID} into ALB Target Group..."
  aws elbv2 register-targets \
    --target-group-arn "${TARGET_GROUP_ARN}" \
    --targets Id="${INSTANCE_ID}" \
    --region "${AWS_REGION}"

  # Step F: Wait for target to achieve 'healthy' status in ALB
  echo "[+] Step F: Waiting for ${INSTANCE_ID} to achieve 'healthy' status in ALB..."
  ALB_TIMEOUT_ATTEMPTS=60
  ALB_ATTEMPT=0
  while true; do
    HEALTH_STATE=$(aws elbv2 describe-target-health \
      --target-group-arn "${TARGET_GROUP_ARN}" \
      --targets Id="${INSTANCE_ID}" \
      --region "${AWS_REGION}" \
      --query "TargetHealthDescriptions[0].TargetHealth.State" \
      --output text 2>/dev/null || echo "initial")

    echo "[*] ALB Health State for ${INSTANCE_ID}: ${HEALTH_STATE}"
    if [[ "${HEALTH_STATE}" == "healthy" ]]; then
      echo "[+] Node ${INSTANCE_ID} is HEALTHY in ALB Target Group."
      break
    elif [[ "${HEALTH_STATE}" == "unhealthy" ]]; then
      echo "[-] CRITICAL: ALB marked instance ${INSTANCE_ID} as UNHEALTHY!" >&2
      exit 1
    fi

    ALB_ATTEMPT=$((ALB_ATTEMPT + 1))
    if [[ "${ALB_ATTEMPT}" -ge "${ALB_TIMEOUT_ATTEMPTS}" ]]; then
      echo "[-] TIMEOUT: Target ${INSTANCE_ID} failed to become healthy within 300 seconds." >&2
      exit 1
    fi

    sleep 5
  done

  echo "[+] Node ${INSTANCE_ID} rolling deployment completed successfully."
done

echo "=========================================================="
echo "[+] Zero-Downtime Rolling Deployment COMPLETED Successfully!"
echo "Version Deployed: ${IMAGE_TAG}"
echo "=========================================================="
exit 0
