# Continuous Delivery & Automated Resilience Scripts

This directory contains production-grade automation scripts for zero-downtime rolling backend deployment, atomic frontend deployment, rapid emergency rollback, and resilience verification.

---

## 1. Tool Inventory

| Script | Purpose | Key Guarantees |
|---|---|---|
| [`deploy-backend.sh`](#deploy-backendsh) | Synchronous SSM Rolling Blue/Green deployment across EC2 backend nodes | Zero 502/504 errors, 15s ALB connection draining, 8081/8082 port swap, health verification |
| [`deploy-frontend.sh`](#deploy-frontendsh) | Atomic two-phase S3 upload & CloudFront edge cache invalidation | Zero blank screens, immutable 1-year cache on hashed assets, strict no-cache on `index.html` |
| [`rollback.sh`](#rollbacksh) | Rapid emergency rollback leveraging local Docker image layer cache | Full restoration in < 2 minutes (< 120s SLA), SSM Parameter Store tag tracking |
| [`simulate-unhealthy-deploy.sh`](#simulate-unhealthy-deploysh) | Automated resilience verification harness | Proves unhealthy container deployment aborts, standby is purged, active stays online |

---

## 2. Architecture & Flow Diagrams

### 2.1 Synchronous SSM Rolling Deployment (`deploy-backend.sh`)

Each EC2 node behind the Application Load Balancer is updated sequentially to maintain 100% service availability:

```
Pipeline / CI Runner (deploy-backend.sh)       ALB Target Group              EC2 Instance Node
           │                                          │                              │
  1. Discover Target Nodes ──────────────────────────►│                              │
           │                                          │                              │
  2. Deregister Node ────────────────────────────────►│                              │
           │                                          │ (In-flight draining)         │
  3. Wait 15s Draining Window                         │                              │
           │                                                                         │
  4. Dispatch SSM Run Command ──────────────────────────────────────────────────────►│
           │                                                                         │
           │                                                             [Local Blue/Green Swap]
           │                                                             - Detect active slot (8081/8082)
           │                                                             - Pull new Docker image
           │                                                             - Start on standby port
           │                                                             - Probe /actuator/health (up to 30x)
           │                                                             - If fail: Stop standby & exit 1
           │                                                             - If healthy: Reload Nginx upstream
           │                                                             - Stop old active container
           │                                                             - Update SSM Parameter tags
           │                                                                         │
  5. Poll SSM Invocation Status (every 3s) ◄─────────────────────────────────────────┤
     (Blocks synchronously until 'Success')                                          │
           │                                                                         │
  6. Re-register Node ───────────────────────────────►│                              │
           │                                          │                              │
  7. Poll Target Health until 'healthy' ─────────────►│                              │
           │                                          │ (ALB health check passes)    │
  8. Node Healthy -> Proceed to next EC2 node         │                              │
```

### 2.2 Atomic Frontend Deployment (`deploy-frontend.sh`)

To eliminate blank screens or broken script references when users load the application during a release, deployments follow a strict 4-phase ordering:

```
Phase 1: Sync Hashed Assets (*.js, *.css, assets/)
         Cache-Control: max-age=31536000,public,immutable
         (Existing users unaffected; new hashed files staged in S3)
           │
           ▼
Phase 2: Sync Metadata (*.json)
         Cache-Control: max-age=300,must-revalidate
           │
           ▼
Phase 3: Upload Entrypoint (index.html) LAST
         Cache-Control: no-cache, no-store, must-revalidate
         Content-Type: text/html
         (Atomic switch: browsers instantly see new asset hashes)
           │
           ▼
Phase 4: Invalidate CloudFront Distribution Cache
         Paths: /index.html and /
         (Edge locations immediately serve latest index.html)
```

### 2.3 Automated Rapid Rollback Engine (`rollback.sh`)

When a regression is detected in production, `rollback.sh` restores the previous verified image in under 2 minutes:

```
DevOps / Alert Trigger
         │
         ▼
Fetch 'previous_image_tag' from SSM Parameter Store (/inventory-api/<env>/previous_image_tag)
         │
         ▼
Validate previous tag exists and differs from current tag
         │
         ▼
Execute deploy-backend.sh with previous image tag
(EC2 instances reuse local Docker layer cache -> Zero download delay)
         │
         ▼
Local standby container starts & passes health check within seconds
         │
         ▼
Nginx reloads upstream -> Old faulty container stopped -> ALB verified healthy
         │
         ▼
Rollback complete in < 120 seconds (< 2 min SLA)
```

---

## 3. Host Port Allocation & State Contracts

Each backend EC2 instance maintains local Blue/Green container isolation behind Nginx:

| Component | Port / Path | Purpose |
|---|---|---|
| **Host Nginx Proxy** | Port `8080` | Listens for ALB traffic; proxies requests to active container |
| **Blue Container Slot** | Port `8081` | Default initial slot (`inventory-api-blue`) |
| **Green Container Slot** | Port `8082` | Alternate standby slot (`inventory-api-green`) |
| **Active Color State** | `/var/run/inventory-api/active_color` | Tracks currently active slot (`blue` or `green`) |
| **Nginx Upstream Config** | `/etc/nginx/conf.d/upstream.conf` | Dynamically reloaded via `nginx -s reload` |
| **CloudWatch Log Group** | `/aws/ec2/inventory-api` | Container stdout/stderr streamed via native `awslogs` driver |
| **SSM Current Tag** | `/inventory-api/<env>/current_image_tag` | Stores currently deployed Docker tag |
| **SSM Previous Tag** | `/inventory-api/<env>/previous_image_tag` | Stores rollback target Docker tag |

---

## 4. Script Usage Reference

### `deploy-backend.sh`

Performs synchronous zero-downtime rolling update across all target group EC2 instances.

```bash
# Basic Usage:
./scripts/deploy-backend.sh <TARGET_GROUP_ARN> <IMAGE_TAG> [AWS_REGION] [ECR_REGISTRY] [ENVIRONMENT]

# Example:
./scripts/deploy-backend.sh \
  "arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/prod-backend-tg/50dc6c495c0c9188" \
  "v1.0.2" \
  "ap-south-1" \
  "123456789012.dkr.ecr.ap-south-1.amazonaws.com" \
  "prod"
```

**Parameters:**
- `TARGET_GROUP_ARN` *(required)*: ARN of the ALB Target Group.
- `IMAGE_TAG` *(required)*: Docker image tag or full image URI.
- `AWS_REGION` *(optional, default: `ap-south-1`)*: AWS region.
- `ECR_REGISTRY` *(optional)*: ECR registry URL for docker login.
- `ENVIRONMENT` *(optional, default: `prod`)*: Target environment (`dev`, `staging`, `prod`).

---

### `deploy-frontend.sh`

Executes two-phase atomic S3 sync and CloudFront cache invalidation.

```bash
# Basic Usage:
./scripts/deploy-frontend.sh <s3-bucket> <cloudfront-distribution-id>
# Or specify custom dist directory:
./scripts/deploy-frontend.sh <dist-dir> <s3-bucket> <cloudfront-distribution-id> [aws-region]

# Example:
./scripts/deploy-frontend.sh \
  "frontend/dist/inventory-app/browser" \
  "prod-frontend-bucket-50dc6c49" \
  "E1234567890EXAMPLE" \
  "ap-south-1"
```

**Parameters:**
- `s3-bucket` *(required)*: Name of the private S3 bucket fronted by CloudFront.
- `cloudfront-distribution-id` *(required)*: ID of the CloudFront distribution.
- `dist-dir` *(optional, default: `frontend/dist/inventory-app/browser`)*: Path to Angular build output.
- `aws-region` *(optional, default: `ap-south-1`)*: AWS region.

---

### `rollback.sh`

Triggers emergency rollback to the previous verified Docker image.

```bash
# Basic Usage:
./scripts/rollback.sh <TARGET_GROUP_ARN> [AWS_REGION] [ECR_REGISTRY] [ENVIRONMENT]

# Example:
./scripts/rollback.sh \
  "arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/prod-backend-tg/50dc6c495c0c9188" \
  "ap-south-1" \
  "123456789012.dkr.ecr.ap-south-1.amazonaws.com" \
  "prod"
```

**Parameters:**
- `TARGET_GROUP_ARN` *(required or discovered via SSM)*: ALB Target Group ARN.
- `AWS_REGION` *(optional, default: `ap-south-1`)*: AWS region.
- `ECR_REGISTRY` *(optional)*: ECR registry domain.
- `ENVIRONMENT` *(optional, default: `prod`)*: Target environment name.

---

### `simulate-unhealthy-deploy.sh`

Resilience verification harness testing that unhealthy deployments halt safely without dropping traffic.

```bash
# Run against live AWS infrastructure:
./scripts/simulate-unhealthy-deploy.sh <TARGET_GROUP_ARN> [AWS_REGION] [ECR_REGISTRY] [ENVIRONMENT]

# Run local port simulation harness:
./scripts/simulate-unhealthy-deploy.sh --local
```

**Verification Guarantees:**
- Proves health check probe loop times out on unhealthy container.
- Proves `deploy-backend.sh` exits with code `1`.
- Proves standby container is immediately stopped and removed.
- Proves active container remains healthy and continues serving traffic.
- Proves instance is restored to ALB Target Group to prevent capacity loss.

---

## 5. Security & Prerequisites

- **IAM Instance Profile**: EC2 instances require the `AmazonSSMManagedInstanceCore` managed policy and custom inline policy granting ECR pull, CloudWatch logs, and SSM Parameter Store read access.
- **Jenkins CI/CD Runner**: Requires permissions to execute `ssm:SendCommand`, `ssm:GetCommandInvocation`, `elasticloadbalancing:DescribeTargetHealth`, `elasticloadbalancing:DeregisterTargets`, `elasticloadbalancing:RegisterTargets`, `s3:Sync`, and `cloudfront:CreateInvalidation`.
- **Operating Environment**: All scripts use `set -euo pipefail` and are syntax-checked with `bash -n`.
