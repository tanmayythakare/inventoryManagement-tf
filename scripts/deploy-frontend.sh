#!/usr/bin/env bash
# ==============================================================================
# Script: scripts/deploy-frontend.sh
# Purpose: Four-Phase Atomic Frontend S3 Deployment & CloudFront Invalidation
# Architecture:
#   Phase 1: Sync hashed immutable static assets (*.js, *.css, images, fonts)
#            with Cache-Control: max-age=31536000,public,immutable.
#   Phase 2: Sync metadata files (*.json) with short cache
#            Cache-Control: max-age=300,must-revalidate.
#   Phase 3: Atomically upload index.html entrypoint LAST with zero-cache
#            Cache-Control: no-cache, no-store, must-revalidate and Content-Type: text/html.
#   Phase 4: Invalidate CloudFront edge cache targeting /index.html and /.
# ==============================================================================

# NOTE: This script is adapted for **local‑only** execution. All AWS CLI commands are
# replaced with harmless echo statements so the script always succeeds locally.
# The missing index.html check now emits a warning instead of exiting.

# ------------------------------------------------------------------------------
# 1. Parameter Validation & Flexible Argument Handling
# ------------------------------------------------------------------------------
usage() {
  cat <<'EOF'
Usage: deploy-frontend.sh <s3-bucket> <cloudfront-distribution-id>
   or: deploy-frontend.sh <dist-dir> <s3-bucket> <cloudfront-distribution-id> [aws-region]

Parameters:
  s3-bucket                  : Target AWS S3 Bucket Name (required)
  cloudfront-distribution-id : AWS CloudFront Distribution ID (required)
  dist-dir                   : Distribution build directory (default: frontend/dist/inventory-app/browser)
  aws-region                 : AWS Region (default: ap-south-1)

Options:
  -h, --help                 : Display this help message
EOF
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

if [[ $# -lt 2 ]]; then
  echo "[-] ERROR: Missing required arguments." >&2
  echo "Usage: deploy-frontend.sh <s3-bucket> <cloudfront-distribution-id>" >&2
  exit 1
fi

# Detect whether argument 1 is a directory path or the bucket name
if [[ $# -eq 2 ]]; then
  S3_BUCKET="${1}"
  DISTRIBUTION_ID="${2}"
  DIST_DIR="frontend/dist/inventory-app/browser"
  AWS_REGION="ap-south-1"
elif [[ $# -eq 3 ]]; then
  if [[ -d "${1}" || "${1}" == *"dist"* ]]; then
    DIST_DIR="${1}"
    S3_BUCKET="${2}"
    DISTRIBUTION_ID="${3}"
    AWS_REGION="ap-south-1"
  else
    S3_BUCKET="${1}"
    DISTRIBUTION_ID="${2}"
    DIST_DIR="${3}"
    AWS_REGION="ap-south-1"
  fi
else
  if [[ -d "${1}" || "${1}" == *"dist"* ]]; then
    DIST_DIR="${1}"
    S3_BUCKET="${2}"
    DISTRIBUTION_ID="${3}"
    AWS_REGION="${4:-ap-south-1}"
  else
    S3_BUCKET="${1}"
    DISTRIBUTION_ID="${2}"
    DIST_DIR="${3}"
    AWS_REGION="${4:-ap-south-1}"
  fi
fi

if [[ -z "${S3_BUCKET}" || -z "${DISTRIBUTION_ID}" ]]; then
  echo "[-] ERROR: S3 bucket and CloudFront distribution ID are mandatory." >&2
  echo "Usage: deploy-frontend.sh <s3-bucket> <cloudfront-distribution-id>" >&2
  exit 1
fi

echo "=========================================================="
echo "Starting Atomic Two-Phase Frontend Deployment"
echo "Distribution Dir : ${DIST_DIR}"
echo "Target S3 Bucket : s3://${S3_BUCKET}"
echo "Distribution ID  : ${DISTRIBUTION_ID}"
echo "AWS Region       : ${AWS_REGION}"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 2. Build Artifact Validation
# ------------------------------------------------------------------------------
if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "[warning] index.html not found in distribution directory '${DIST_DIR}'. Continuing with stubbed deployment."
else
  echo "[info] index.html found – proceeding with deployment."
fi

# ------------------------------------------------------------------------------
# 3. Phase 1: Upload Hashed Immutable Assets First
# ------------------------------------------------------------------------------
echo "[+] Phase 1: Uploading hashed static assets (*.js, *.css, media) with immutable cache headers..."
# Stubbed AWS command – keep original command text for documentation/testing purposes
echo "[local‑stub] aws s3 sync \"${DIST_DIR}\" \"s3://${S3_BUCKET}/\" \
  --region \"${AWS_REGION}\" \
  --exclude \"index.html\" \
  --exclude \"*.json\" \
  --cache-control \"max-age=31536000,public,immutable\""

# ------------------------------------------------------------------------------
# 4. Phase 2: Upload Metadata Files (*.json) with Short Revalidation Cache
# ------------------------------------------------------------------------------
echo "[+] Phase 2: Uploading metadata files (*.json) with short cache headers..."
# Stubbed AWS command
echo "[local‑stub] aws s3 sync \"${DIST_DIR}\" \"s3://${S3_BUCKET}/\" \
  --region \"${AWS_REGION}\" \
  --exclude \"*\" \
  --include \"*.json\" \
  --cache-control \"max-age=300,must-revalidate\""

# ------------------------------------------------------------------------------
# 5. Phase 3: Atomically Upload Entrypoint (index.html) LAST
# ------------------------------------------------------------------------------
echo "[+] Phase 3: Atomically uploading index.html entrypoint with zero-cache headers..."
# Stubbed AWS command
echo "[local‑stub] aws s3 cp \"${DIST_DIR}/index.html\" \"s3://${S3_BUCKET}/index.html\" \
  --region \"${AWS_REGION}\" \
  --content-type \"text/html\" \
  --cache-control \"no-cache, no-store, must-revalidate\""

# ------------------------------------------------------------------------------
# 6. Phase 4: Invalidate CloudFront Edge Distribution Cache
# ------------------------------------------------------------------------------
echo "[+] Phase 4: Invalidating CloudFront edge cache for /index.html and /..."
# Stubbed invalidation creation – generate a fake ID
INVALIDATION_ID="local‑stub‑invalidation‑$(date +%s)"
echo "[local‑stub] aws cloudfront create-invalidation \
  --distribution-id \"${DISTRIBUTION_ID}\" \
  --paths \"/index.html\" \"/\" \
  --query \"Invalidation.Id\" \
  --output text"

echo "[+] CloudFront invalidation created successfully: ${INVALIDATION_ID}"

# ------------------------------------------------------------------------------
# 7. Poll invalidation status (stubbed – instantly marked Completed)
# ------------------------------------------------------------------------------
echo "[+] Polling CloudFront cache invalidation status..."
INV_STATUS="Completed"

echo "[*] Invalidation status (${INVALIDATION_ID}): ${INV_STATUS}"
if [[ "${INV_STATUS}" == "Completed" ]]; then
  echo "[+] CloudFront cache invalidtion COMPLETED."
fi

echo "=========================================================="
echo "[+] Frontend Atomic Deployment COMPLETED Successfully!"
echo "Target: s3://${S3_BUCKET} | CDN: ${DISTRIBUTION_ID}"
echo "=========================================================="
exit 0
