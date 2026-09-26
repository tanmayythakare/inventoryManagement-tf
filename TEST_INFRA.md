# E2E Test Infra: Enterprise Cloud DevOps Platform & Three-Tier Workload

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived strictly from `ORIGINAL_REQUEST.md` and user-facing specifications. No dependency on implementation internals.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- **Independence**: Evaluates the platform externally via HTTP REST endpoints, CLI tools, scripts, and static configuration validation.

---

## Feature Inventory & Test Coverage Matrix
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|-------------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| F01 | JWT Authentication | R1 | 5 | 5 | ✓ | ✓ |
| F02 | Product Catalog | R1 | 5 | 5 | ✓ | ✓ |
| F03 | Pessimistic Lock Stock Reservation | R1, R2 | 5 | 5 | ✓ | ✓ |
| F04 | Mathematical Stock Audit Logging | R1 | 5 | 5 | ✓ | ✓ |
| F05 | Actuator Health Probes | R1 | 5 | 5 | ✓ | ✓ |
| F06 | Flyway Schema Migrations | R1 | 5 | 5 | ✓ | ✓ |
| F07 | Angular 18 Standalone UI Screens | R1 | 5 | 5 | ✓ | ✓ |
| F08 | Frontend Auth Interceptor & Refresh | R1 | 5 | 5 | ✓ | ✓ |
| F09 | Local Docker Compose Runtime | R1 | 5 | 5 | ✓ | ✓ |
| F10 | Frontend Unit Tests (Karma >=60%) | R2 | 5 | 5 | ✓ | ✓ |
| F11 | Backend Unit Tests (JUnit 5) | R2 | 5 | 5 | ✓ | ✓ |
| F12 | Testcontainers Concurrency Test | R2 | 5 | 5 | ✓ | ✓ |
| F13 | TruffleHog Secret Scanning | R3 | 5 | 5 | ✓ | ✓ |
| F14 | Trivy IaC Security Scanning | R3 | 5 | 5 | ✓ | ✓ |
| F15 | Unified JUnit Report Publication | R3 | 5 | 5 | ✓ | ✓ |
| F16 | Multi-Stage Hardened Container | R3 | 5 | 5 | ✓ | ✓ |
| F17 | Trivy Container CVE Policy | R3 | 5 | 5 | ✓ | ✓ |
| F18 | CycloneDX Syft SBOM (bom.json) | R3 | 5 | 5 | ✓ | ✓ |
| F19 | Immutable ECR Publishing | R3 | 5 | 5 | ✓ | ✓ |
| F20 | Terraform Bootstrap Pattern | R4 | 5 | 5 | ✓ | ✓ |
| F21 | Three-Tier VPC Architecture | R4 | 5 | 5 | ✓ | ✓ |
| F22 | ALB Port 80 Redirect to 443 | R4 | 5 | 5 | ✓ | ✓ |
| F23 | Dual-Region ACM SSL | R4 | 5 | 5 | ✓ | ✓ |
| F24 | Private EC2 Compute & IAM | R4 | 5 | 5 | ✓ | ✓ |
| F25 | Amazon RDS PostgreSQL 16 | R4 | 5 | 5 | ✓ | ✓ |
| F26 | S3 & CloudFront OAC CDN | R4 | 5 | 5 | ✓ | ✓ |
| F27 | Terraform Remote State & Drift | R4 | 5 | 5 | ✓ | ✓ |
| F28 | Synchronous SSM Rolling Deploy | R5 | 5 | 5 | ✓ | ✓ |
| F29 | Frontend Atomic Deployment | R5 | 5 | 5 | ✓ | ✓ |
| F30 | CloudWatch Logging & SNS Alerting | R5 | 5 | 5 | ✓ | ✓ |
| F31 | Rapid Rollback Engine (< 2 min) | R5 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture
- **Test Runner**: Node.js / JavaScript automated runner located at `tests/e2e/runner.js`.
- **Execution Command**: `node tests/e2e/runner.js`
- **Pass/Fail Semantics**: Process exits with code `0` on 100% test pass; non-zero exit code if any test assertion fails. Outputs structured TAP or JSON test summaries.
- **Directory Layout**:
  - `tests/e2e/tier1_feature/`: Isolated feature correctness tests.
  - `tests/e2e/tier2_boundary/`: Edge cases, negative assertions, input validation, and boundary conditions.
  - `tests/e2e/tier3_combination/`: Pairwise interaction tests (e.g. concurrent token refresh while placing order, deployment during health probe failure).
  - `tests/e2e/tier4_workload/`: Full real-world workflows from authentication to order fulfillment and zero-downtime rolling update.

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | High-Concurrency Flash Sale | F01, F02, F03, F04, F08, F12 | High |
| 2 | End-to-End DevSecOps Pipeline Promotion | F13, F14, F15, F16, F17, F18, F19 | High |
| 3 | Zero-Downtime Rolling Update Under Active Traffic | F05, F22, F24, F28, F30 | High |
| 4 | Unhealthy Container Deployment Abort & Rollback | F05, F28, F30, F31 | High |
| 5 | Full Cloud Infrastructure Verification & Drift Detection | F20, F21, F22, F23, F24, F25, F26, F27 | High |
| 6 | Frontend SPA Deep Routing & Token Refresh Lifecycle | F01, F07, F08, F26, F29 | Medium |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >= 5 test cases per feature (31 features × 5 = 155 tests minimum).
- **Tier 2 (Boundary & Corner Cases)**: >= 5 test cases per feature (31 features × 5 = 155 tests minimum).
- **Tier 3 (Cross-Feature Combinations)**: >= 31 test cases covering pairwise interactions.
- **Tier 4 (Real-World Scenarios)**: >= 6 comprehensive end-to-end workload scenarios.
- **Total Minimum Target**: ~347 test cases.
