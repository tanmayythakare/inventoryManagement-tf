# Nightly Infrastructure Drift Detection Specification & Runbook

## 1. Overview & Architecture

Infrastructure as Code (IaC) guarantees reproducible, deterministic cloud infrastructure only if the live cloud state matches the declared Terraform configuration. In production cloud environments, out-of-band modifications (such as emergency console hotfixes, unauthorized changes, or AWS-side automated updates) can cause **infrastructure drift**.

To maintain zero-trust cloud integrity, this platform implements an automated **Nightly Drift Detection Engine** orchestrated via Jenkins LTS (`Jenkinsfile.drift`) on an Amazon EC2 `t3.micro` instance in `ap-south-1`.

```
                  ┌────────────────────────────────────────┐
                  │ Jenkins Scheduled Trigger (H 2 * * *)  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │ Clone Repository & Init Remote State   │
                  │   (terraform/environments/prod)        │
                  │   (S3 Native Lock: use_lockfile=true)  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │ terraform plan -detailed-exitcode      │
                  └───────┬────────────────────────┬───────┘
                          │                        │
               Exit Code 0│             Exit Code 2│
                          ▼                        ▼
               ┌─────────────────────┐  ┌───────────────────────────────┐
               │    Clean Sync       │  │    Infrastructure Drift       │
               │ No drift detected   │  │ 1. Capture drift-report.txt   │
               │ Status: GREEN       │  │ 2. Archive Jenkins Artifact   │
               └─────────────────────┘  │ 3. Send SNS Operator Alert    │
                                        │ 4. Terminate with Exit 2      │
                                        └───────────────────────────────┘
```

---

## 2. Remote State & Locking Architecture

Per R4 (lines 47–49 & 57–60), the platform manages Terraform state through:
- **Encrypted S3 Remote State**: State is persisted at `environments/{env}/terraform.tfstate` in an S3 bucket configured with AES-256 server-side encryption and versioning.
- **Native S3 State Locking (`use_lockfile = true`)**: Terraform 1.9+ leverages native S3 conditional writes (`.tflock` objects) for locking, eliminating the requirement for DynamoDB state locking tables.
- **Concurrency Protection**: If a deployment or drift check attempts to execute while another process holds the state lock, Terraform halts immediately to prevent state corruption.

---

## 3. Drift Detection Engine: `Jenkinsfile.drift`

### 3.1 Job Configuration & Schedule
- **Schedule**: `cron('H 2 * * *')` (Executes nightly between 02:00 and 03:00 UTC during off-peak traffic).
- **Target Environments**: Configurable via parameter `TARGET_ENV` (`prod`, `staging`, `dev`). Default: `prod`.
- **Alert Policy**: Enabled by default via `ALERT_ON_DRIFT = true`.

### 3.2 Command Execution & Exit Code Semantics
The drift detection stage runs:
```bash
terraform plan -detailed-exitcode -no-color > drift-report.txt 2>&1
```

Terraform exit codes conform to standard POSIX-extended exit status:
| Exit Code | Classification | Meaning | Action Taken |
|:---------:|:--------------:|:--------|:-------------|
| **`0`** | **IN_SYNC** | Infrastructure perfectly matches declared state. S3 remote state is identical to AWS API responses. | Job succeeds with Green status. |
| **`1`** | **ERROR** | Plan execution failed (e.g., AWS API rate limits, invalid IAM credentials, network error). | Job terminates with error code 1. Alert dispatched for system inspection. |
| **`2`** | **DRIFT_DETECTED** | Live cloud resources differ from Terraform configuration (additions, modifications, or deletions present). | Captures diff in `drift-report.txt`, archives artifact, dispatches SNS alert, and exits with code 2 to mark build Unstable/Failed. |

---

## 4. Alerting & Notification Pipeline

When exit code `2` is returned:
1. **Console Diff**: The detailed diff output is logged directly to Jenkins console.
2. **Artifact Archiving**: `drift-report.txt` is archived in Jenkins build records for audit compliance.
3. **Amazon SNS Alert**: The pipeline publishes a notification to the topic `infra-drift-alerts` containing:
   - Affected Environment (`dev`, `staging`, `prod`)
   - AWS Region (`ap-south-1`)
   - Direct link to Jenkins Build URL (`${BUILD_URL}`)
   - Diff summary

---

## 5. Drift Reconciliation & Remediation Runbook

When an on-call engineer receives an infrastructure drift alert:

### Step 1: Inspect the Drift Report
Download and review `drift-report.txt` from the Jenkins build artifacts:
```bash
cat drift-report.txt
```
Identify whether the drift represents:
- **Legitimate out-of-band change** (e.g., approved emergency security group fix in AWS console).
- **Unauthorized tampering or misconfiguration** (e.g., developer manually stopped an EC2 instance or altered an ALB listener).
- **AWS-side automated change** (e.g., AWS service-managed tag updates).

### Step 2: Choose Remediation Path

#### Option A: Reconcile Code to Match Reality (If change was intentional)
1. Update the appropriate `.tf` file in `terraform/modules/` or `terraform/environments/`.
2. Commit and push the changes to Git.
3. Run the CI/CD pipeline to promote the updated plan.

#### Option B: Revert Infrastructure to Match Declared Code (If drift was unauthorized)
1. Navigate to the environment directory:
   ```bash
   cd terraform/environments/prod
   terraform init
   ```
2. Generate an immutable execution plan:
   ```bash
   terraform plan -out=tfplan
   ```
3. Verify that the plan will only reverse the drifted resources.
4. Apply the approved plan:
   ```bash
   terraform apply tfplan
   ```
5. Re-run `Jenkinsfile.drift` to confirm clean status (`Exit Code 0`).
