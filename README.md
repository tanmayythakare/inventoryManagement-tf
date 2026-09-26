# Enterprise Cloud DevOps Platform & Three-Tier Workload

Production-ready cloud DevOps delivery platform and three-tier workload (Angular 18, Spring Boot 3.3 / Java 21, PostgreSQL 16) deployed on AWS (`ap-south-1`) with DevSecOps quality gates, Terraform 1.9+ Infrastructure as Code (IaC) with native S3 state locking, and zero-downtime rolling deployments with automated rollback.

---

## 🏛️ Architecture

```
                                [ Internet ]
                                     │
                   ┌─────────────────┴─────────────────┐
                   ▼                                   ▼
        [ CloudFront CDN + OAC ]             [ AWS ALB (ap-south-1) ]
          (us-east-1 ACM SSL)                  (ap-south-1 ACM SSL)
                   │                            (Port 80 -> 301 -> 443)
                   ▼                                   │
          [ S3 Frontend Bucket ]                       ▼
        (Angular 18 Standalone)              [ Private Subnet App EC2 ]
                                              (Nginx Reverse Proxy :8080)
                                                       │
                                            ┌──────────┴──────────┐
                                            ▼                     ▼
                                     [ Blue Container ]    [ Green Container ]
                                        (:8081)               (:8082)
                                     Spring Boot 3.3       Spring Boot 3.3
                                            │                     │
                                            └──────────┬──────────┘
                                                       │
                                                       ▼
                                            [ Amazon RDS PostgreSQL 16 ]
                                             (Isolated Private DB Subnet)
```

---

## 🚀 Tech Stack

* **Frontend**: Angular 18 (Standalone Components), RxJS, Tailwind/Vanilla CSS, Karma & Jasmine unit testing.
* **Backend**: Spring Boot 3.3, Java 21, Spring Security (Stateless JWT), Spring Data JPA, Flyway (DB migrations), Actuator health probes.
* **Database**: PostgreSQL 16 with pessimistic row-locking (`SELECT ... FOR UPDATE`) and delta-based stock audit logging.
* **Infrastructure**: Terraform 1.9+ (Modular: VPC, Security Groups, ALB, ACM Dual-Region, EC2, RDS, S3/CloudFront OAC, CloudWatch/SNS).
* **CI/CD & DevSecOps**: Jenkins, TruffleHog (secret scanning), Trivy (IaC and container vulnerability scanning), Syft (CycloneDX SBOM), Amazon ECR (immutable tags).
* **Delivery Engine**: AWS SSM-driven rolling Blue/Green deployment (`:8081` / `:8082`) with local Nginx reverse proxy and sub-2-minute emergency rollback.

---

## 📁 Repository Structure

```
├── .dockerignore                 # Docker build exclusions
├── .gitignore                    # Git version control ignore rules
├── .trivyignore                  # Approved security policy exceptions for Trivy
├── .trufflehog.yaml              # Secret scanner detector & allowlist configuration
├── Jenkinsfile                   # Root CI/CD delivery pipeline
├── README.md                     # Project overview and runbook
├── docker-compose.yml            # Local development orchestration
├── docs/                         # Architecture, testing, and operational runbooks
│   ├── PROJECT.md                # Detailed architecture and API contract specifications
│   ├── DRIFT_DETECTION.md        # SRE operational runbook for infrastructure drift
│   └── TEST_INFRA.md             # Testing pyramid methodology and verification matrix
├── jenkins/                      # Dedicated Jenkins pipeline definitions
│   ├── jenkins-ci                # Continuous Integration (build, test, security scans, SBOM)
│   ├── jenkins-cd                # Continuous Delivery (ECR publish, SSM rolling deploy)
│   ├── jenkins-tf                # Infrastructure as Code (Terraform plan, scan, and gated apply)
│   └── Jenkinsfile.drift         # Scheduled Terraform remote state drift detection
├── backend/                      # Spring Boot 3.3 REST API (Java 21)
│   ├── src/main/java/            # Controllers, Services, Entities, Repositories, Security
│   ├── src/main/resources/       # application.yml and Flyway migrations (V1-V5)
│   ├── src/test/                 # Unit & Testcontainers concurrency tests
│   ├── Dockerfile                # Multi-stage hardened alpine non-root container
│   └── pom.xml
├── frontend/                     # Angular 18 Single-Page Application
│   ├── src/app/                  # Standalone pages, models, auth guards & interceptors
│   ├── src/environments/         # Environment configs
│   ├── Dockerfile                # Static build with Nginx container
│   └── package.json
├── terraform/                    # Infrastructure as Code (Terraform 1.9+)
│   ├── bootstrap/                # S3 state bucket (native lockfile) & Jenkins EC2 runner
│   ├── modules/                  # Reusable modules (vpc, alb, rds, ec2, s3_cloudfront, etc.)
│   └── environments/             # Environment configs (dev, staging, prod)
├── scripts/                      # Continuous delivery & resilience automation
│   ├── deploy-backend.sh         # Synchronous SSM rolling Blue/Green deployment
│   ├── deploy-frontend.sh        # Two-phase atomic S3 sync & CloudFront CDN invalidation
│   ├── rollback.sh               # Rapid emergency rollback (< 2 min SLA)
│   └── simulate-unhealthy-deploy.sh # Automated resilience verification test
└── tests/                        # Comprehensive End-to-End Test Suite
    └── e2e/                      # Opaque-box test harness (Tiers 1-4, 348 test cases)
        ├── runner.js             # Master test runner
        ├── tier1_feature/        # Feature contract tests
        ├── tier2_boundary/       # Boundary value & edge-case tests
        ├── tier3_combination/    # Multi-service interaction tests
        └── tier4_workload/       # Concurrency, load & resilience scenarios
```

---

## ⚡ Quick Start: Local Development

Run the entire 3-tier stack locally using Docker Compose:

```bash
docker compose up --build -d
```

### Access Endpoints
* **Web Frontend**: [http://localhost](http://localhost)
* **Backend Health Probe**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
* **Product Catalog API**: [http://localhost:8080/api/v1/products](http://localhost:8080/api/v1/products)
* **Default Credentials**: `admin` / `password123`

To tear down:
```bash
docker compose down -v
```

---

## ☁️ Cloud Deployment Runbook

### 1. Bootstrap State & CI Runner
```bash
cd terraform/bootstrap
terraform init
terraform apply
```

### 2. Provision Target Environment (e.g. Dev)
```bash
cd ../environments/dev
terraform init
terraform apply
```

### 3. Deploy Workloads
* **Backend (SSM Rolling Blue/Green)**:
  ```bash
  ./scripts/deploy-backend.sh <IMAGE_URI> <ALB_TARGET_GROUP_ARN> [AWS_REGION]
  ```
* **Frontend (Atomic S3 + CloudFront)**:
  ```bash
  ./scripts/deploy-frontend.sh <DIST_DIR> <S3_BUCKET> <DISTRIBUTION_ID> [AWS_REGION]
  ```
* **Emergency Rollback**:
  ```bash
  ./scripts/rollback.sh <INSTANCE_ID> [AWS_REGION]
  ```

---

## 🛡️ DevSecOps Quality Gates

The pipeline ([`Jenkinsfile`](./Jenkinsfile)) enforces 7 mandatory gates on every commit:
1. **Gate 1**: TruffleHog secret scanning (`--fail` on leaked credentials).
2. **Gate 2**: Trivy IaC static analysis on `terraform/` (zero HIGH/CRITICAL misconfigurations).
3. **Gate 3**: Unit test verification (Angular Karma $\ge 60\%$ coverage threshold, Backend JUnit/Testcontainers).
4. **Gate 4**: Multi-stage non-root container packaging (`eclipse-temurin:21-jre-alpine`).
5. **Gate 5**: Trivy image vulnerability scan (zero CRITICAL unfixed CVEs).
6. **Gate 6**: Syft CycloneDX SBOM generation (`bom.json`).
7. **Gate 7**: Immutable ECR publishing tagged strictly with git commit SHA.

---

## 🧪 Testing Suite

Execute the master opaque-box E2E test suite:

```bash
node tests/e2e/runner.js
```

Options:
* `node tests/e2e/runner.js --tier 1` — Run feature contract tests only.
* `node tests/e2e/runner.js --tier 4` — Run end-to-end stress & resilience scenarios.
* `node tests/e2e/runner.js --verbose` — Detailed assertion logging.

---

## 📚 Documentation Reference

* [Architecture & API Contracts](docs/PROJECT.md)
* [Infrastructure Drift Detection Runbook](docs/DRIFT_DETECTION.md)
* [Testing Architecture & Coverage Matrix](docs/TEST_INFRA.md)
* [Deployment Scripts Runbook](scripts/README.md)
