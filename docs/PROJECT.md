# Project: Enterprise Cloud DevOps Platform & Three-Tier Workload

## Architecture
The platform delivers an enterprise-grade cloud DevOps delivery platform and three-tier workload (Angular 18, Spring Boot 3.3 Java 21, PostgreSQL 16) deployed on AWS (ap-south-1) with dual-track quality gates, DevSecOps hardening, Terraform 1.9+ IaC with native S3 state locking, and zero-downtime rolling deployments with automated rollback.

### Multi-Tier Workload Architecture
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

### DevSecOps Delivery Architecture
```
[ Developer / Git Commit ]
       │
       ▼
[ Jenkins Pipeline Runner (EC2 t3.micro + 2GB Swap) ]
  ├── 1. TruffleHog Secret Scanning (--fail exit 183)
  ├── 2. Trivy IaC Security Scanning (terraform/ --severity HIGH,CRITICAL --exit-code 1)
  ├── 3. Unit & Integration Testing (Frontend Karma >=60%, Backend Maven Testcontainers)
  ├── 4. Multi-Stage Docker Build (eclipse-temurin:21-jre-alpine)
  ├── 5. Trivy Container Vulnerability Scan (--ignore-unfixed --severity CRITICAL)
  ├── 6. Syft CycloneDX SBOM Generation (bom.json)
  ├── 7. Immutable ECR Publishing (inventory-api:<git-sha>)
  └── 8. SSM Rolling Deployment & Verification (deploy-backend.sh / rollback.sh)
```

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | JWT Authentication | Stateless auth with `/api/v1/auth/login` and `/api/v1/auth/refresh` | M1 | R1 |
| F02 | Product Catalog API | `/api/v1/products` returning catalog items with computed available stock | M1 | R1 |
| F03 | Pessimistic Lock Stock Reservation | `/api/v1/orders/{id}/confirm` acquiring row locks `SELECT ... FOR UPDATE` ordered by ID | M1 | R1 |
| F04 | Mathematical Stock Audit Logging | Delta logging (`quantity_delta`, `reserved_quantity_delta`) tracking physical & reserved balance | M1 | R1 |
| F05 | Actuator Health Probes | `/actuator/health` reporting liveness and readiness status | M1 | R1 |
| F06 | Flyway Schema Migrations | DDL migrations V1__ through V5__ (users, products, orders, audit, seed data) | M1 | R1 |
| F07 | Angular 18 Standalone UI | 5 responsive screens: `/login`, `/dashboard`, `/products`, `/inventory`, `/orders` | M1 | R1 |
| F08 | Frontend Auth Interceptor | Bearer token injection and concurrent 401 token refresh queue | M1 | R1 |
| F09 | Local Docker Compose | `docker-compose.yml` linking Postgres 16, backend, and frontend with healthchecks | M1 | R1 |
| F10 | Frontend Unit Tests | Angular CLI/Karma unit tests (.spec.ts) enforcing >= 60% coverage threshold | M2 | R2 |
| F11 | Backend Unit Tests | JUnit 5 + Mockito validating business logic and state machine transitions | M2 | R2 |
| F12 | Testcontainers Concurrency Test | PostgreSQL 16 test proving 2 concurrent threads for 1 unit yields 1 success, 1 conflict | M2 | R2 |
| F13 | TruffleHog Secret Scanning | Secret scanning failing pipeline builds on leaked credentials (`--fail`) | M3 | R3 |
| F14 | Trivy IaC Security Scanning | Static analysis & IaC security scanning across `terraform/` | M3 | R3 |
| F15 | Unified Test & JUnit Reporting | Test execution and JUnit XML report publishing in Jenkins | M3 | R3 |
| F16 | Multi-Stage Hardened Container | `backend/Dockerfile` using `eclipse-temurin:21-jre-alpine` running as non-root | M3 | R3 |
| F17 | Trivy Container CVE Scan | Zero CRITICAL unfixed CVEs policy enforcement | M3 | R3 |
| F18 | CycloneDX SBOM Generation | Syft generating compliant `bom.json` archived in Jenkins | M3 | R3 |
| F19 | Immutable ECR Publishing | Push container image strictly tagged with Git commit SHA | M3 | R3 |
| F20 | Terraform Bootstrap Pattern | S3 state bucket with native lockfile (`use_lockfile = true`) + Jenkins EC2 (2GB swap) | M4 | R4 |
| F21 | Three-Tier VPC Architecture | 6 subnets across 2 AZs (2 public, 2 private app, 2 isolated DB) + IGW + NAT | M4 | R4 |
| F22 | ALB with HTTP 301 Redirect | Port 80 redirecting 301 to Port 443; Target Group checking `/actuator/health` | M4 | R4 |
| F23 | Dual-Region ACM SSL | ALB in `ap-south-1` and CloudFront in `us-east-1` via aliased provider | M4 | R4 |
| F24 | Private EC2 Compute & IAM | Backend EC2 in private app subnets with SSM, ECR, CloudWatch IAM profile | M4 | R4 |
| F25 | Amazon RDS PostgreSQL 16 | RDS in private DB subnets with KMS encryption and deletion protection | M4 | R4 |
| F26 | S3 & CloudFront OAC CDN | Private S3 bucket + CloudFront OAC + SPA error routing (403/404 -> `/index.html`) | M4 | R4 |
| F27 | Terraform Remote State & Drift | `environments/{env}/terraform.tfstate`, plan-file promotion, nightly drift detection | M4 | R4 |
| F28 | Synchronous SSM Rolling Deploy | `deploy-backend.sh` with ALB drain, 8081/8082 Blue/Green swap, health probe, atomic switch | M5 | R5 |
| F29 | Frontend Atomic Deployment | `deploy-frontend.sh` uploading hashed assets first, no-cache index.html last, CDN invalidation | M5 | R5 |
| F30 | CloudWatch Logging & SNS Alerting | Docker `awslogs` driver to `/aws/ec2/inventory-api`, metric filter `[ERROR]` -> SNS email | M5 | R5 |
| F31 | Rapid Rollback Engine | `rollback.sh` restoring `previous_image_tag` from SSM Parameter Store in < 2 minutes | M5 | R5 |
| F32 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test suite covering all features, boundaries, and flows | E2E | Acceptance |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Lean Three-Tier Workload | F01–F09: Spring Boot 3.3, Flyway V1-V5, Angular 18 UI, Docker Compose | none | DONE |
| M2 | Testing Pyramid & Concurrency Guardrails | F10–F12: Karma >=60% coverage, JUnit 5 + Mockito, Testcontainers Concurrency Test | M1 | DONE |
| M3 | DevSecOps Hardened CI Pipeline | F13–F19: Jenkinsfile, TruffleHog, Trivy IaC & Image, Syft SBOM, ECR push | M1, M2 | DONE |
| M4 | Terraform IaC & Bootstrap Pattern | F20–F27: Bootstrap S3 lockfile, Jenkins EC2, VPC, ALB, ACM, RDS, CloudFront, EC2 | none | DONE |
| M5 | Zero-Downtime Deploy & Resilience Engine | F28–F31: `deploy-backend.sh`, `deploy-frontend.sh`, CloudWatch/SNS, `rollback.sh` | M1, M4 | DONE |
| E2E | Comprehensive E2E Testing Track | F32: Opaque-box test harness, runner, Tier 1-4 test cases, validation | none | DONE |

---

## Interface Contracts

### 1. Auth & User API Contract (`backend` ↔ `frontend`)
- `POST /api/v1/auth/login`:
  - Request: `{"username": "string", "password": "string"}`
  - Response (200 OK): `{"accessToken": "jwt_token", "refreshToken": "uuid", "expiresIn": 900, "tokenType": "Bearer", "username": "admin", "roles": ["ADMIN"]}`
  - Response (401 Unauthorized): `{"error": "INVALID_CREDENTIALS", "message": "Bad credentials"}`
- `POST /api/v1/auth/refresh`:
  - Request: `{"refreshToken": "uuid"}`
  - Response (200 OK): `{"accessToken": "new_jwt_token", "refreshToken": "new_or_existing_uuid", "expiresIn": 900, "tokenType": "Bearer"}`
  - Response (401 Unauthorized): `{"error": "TOKEN_EXPIRED", "message": "Refresh token expired or invalid"}`

### 2. Catalog & Inventory Contract (`backend` ↔ `frontend`)
- `GET /api/v1/products`:
  - Response (200 OK): `[{"id": 1, "sku": "PROD-WIDGET-001", "name": "Industrial Widget", "price": 49.99, "quantity": 100, "reservedQuantity": 15, "availableQuantity": 85, "active": true}]`
- `POST /api/v1/orders/{id}/confirm`:
  - Request: empty body (order items already associated with order)
  - Pessimistic Locking: Acquires `SELECT ... FOR UPDATE` on each product in ascending numerical ID order (`ORDER BY id ASC`).
  - Response (200 OK): `{"orderId": 123, "status": "CONFIRMED", "totalAmount": 99.98, "confirmedAt": "2026-09-25T17:00:00Z"}`
  - Response (409 Conflict): `{"error": "INSUFFICIENT_STOCK", "message": "Insufficient available quantity for product SKU PROD-EDGE-003", "productId": 3, "requested": 1, "available": 0}`

### 3. Health & Telemetry Contract (`backend` ↔ ALB / Docker / SSM)
- `GET /actuator/health`:
  - Response (200 OK): `{"status": "UP", "components": {"db": {"status": "UP", "details": {"database": "PostgreSQL"}}, "diskSpace": {"status": "UP"}}}`
  - Response (503 Service Unavailable): `{"status": "DOWN", ...}`

### 4. Database Schema Contract (`backend` ↔ PostgreSQL 16)
- Migrations:
  - `V1__init_users_table.sql`: `users` (`id`, `username`, `password_hash`, `role`, `created_at`), `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `revoked`).
  - `V2__init_products_table.sql`: `products` (`id`, `sku` UNIQUE, `name`, `price`, `quantity`, `reserved_quantity`, `active`, `version`). Constraints: `quantity >= 0`, `reserved_quantity >= 0`, `reserved_quantity <= quantity`.
  - `V3__init_orders_and_items.sql`: `orders` (`id`, `user_id`, `status` [PENDING, CONFIRMED, CANCELLED], `total_amount`, `created_at`), `order_items` (`id`, `order_id`, `product_id`, `quantity`, `unit_price`).
  - `V4__init_stock_audit_log.sql`: `stock_audit_log` (`id`, `product_id`, `order_id`, `operation_type`, `quantity_delta`, `reserved_quantity_delta`, `new_quantity`, `new_reserved_quantity`, `created_at`).
  - `V5__seed_initial_data.sql`: Seed data for administrative & demo users, products (including `PROD-EDGE-003` with 1 stock for concurrency tests), baseline audit logs, sample orders.

### 5. Local Reverse Proxy & Deployment Port Swap Contract (`deploy-backend.sh` ↔ Nginx)
- Local Nginx listens on port 8080.
- Upstream backend points to active container:
  - Blue: `127.0.0.1:8081`
  - Green: `127.0.0.1:8082`
- State maintained in `/etc/nginx/conf.d/upstream.conf` and `/var/run/inventory-api/active_color`.

---

## Code Layout
```
h:/Projects/mini-projects/pr-terraform/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/devops/inventory/
│   │   │   │   ├── config/ (SecurityConfig, JwtConfig, WebConfig)
│   │   │   │   ├── controller/ (AuthController, ProductController, OrderController)
│   │   │   │   ├── dto/ (AuthRequest, AuthResponse, ProductDto, OrderDto)
│   │   │   │   ├── entity/ (User, Product, Order, OrderItem, StockAuditLog)
│   │   │   │   ├── exception/ (GlobalExceptionHandler, InsufficientStockException)
│   │   │   │   ├── repository/ (UserRepository, ProductRepository, OrderRepository, StockAuditLogRepository)
│   │   │   │   ├── security/ (JwtTokenProvider, JwtAuthenticationFilter, UserDetailsServiceImpl)
│   │   │   │   └── service/ (AuthService, ProductService, OrderService, InventoryService)
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/
│   │   │           ├── V1__init_users_table.sql
│   │   │           ├── V2__init_products_table.sql
│   │   │           ├── V3__init_orders_and_items.sql
│   │   │           ├── V4__init_stock_audit_log.sql
│   │   │           └── V5__seed_initial_data.sql
│   │   └── test/
│   │       └── java/com/devops/inventory/
│   │           ├── unit/ (AuthServiceTest, OrderServiceTest, InventoryServiceTest)
│   │           └── integration/ (ConcurrentOrderReservationTest, HealthActuatorTest)
│   ├── pom.xml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/ (auth.guard.ts, auth.interceptor.ts, auth.service.ts, api.service.ts)
│   │   │   ├── models/ (user.model.ts, product.model.ts, order.model.ts)
│   │   │   └── pages/
│   │   │       ├── login/ (login.component.ts, .html, .css, .spec.ts)
│   │   │       ├── dashboard/ (dashboard.component.ts, .html, .css, .spec.ts)
│   │   │       ├── products/ (products.component.ts, .html, .css, .spec.ts)
│   │   │       ├── inventory/ (inventory.component.ts, .html, .css, .spec.ts)
│   │   │       └── orders/ (orders.component.ts, .html, .css, .spec.ts)
│   │   ├── environments/ (environment.ts, environment.prod.ts)
│   │   ├── index.html
│   │   └── main.ts
│   ├── angular.json
│   ├── karma.conf.js
│   ├── package.json
│   └── tsconfig.json
├── terraform/
│   ├── bootstrap/
│   │   ├── main.tf (S3 bucket, use_lockfile = true, Jenkins EC2, IAM profile, SG, 2GB swap)
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── user_data_jenkins.sh
│   ├── environments/
│   │   ├── dev/ (main.tf, backend.tf, variables.tf, terraform.tfvars, outputs.tf)
│   │   ├── staging/ (main.tf, backend.tf, variables.tf, terraform.tfvars, outputs.tf)
│   │   └── prod/ (main.tf, backend.tf, variables.tf, terraform.tfvars, outputs.tf)
│   └── modules/
│       ├── vpc/ (6 subnets across 2 AZs, IGW, NAT Gateway, route tables)
│       ├── security/ (Security groups: ALB, EC2 backend, RDS, Jenkins)
│       ├── alb/ (ALB, Port 80 redirect -> 443, Target Group /actuator/health)
│       ├── acm/ (Dual-region SSL: ap-south-1 ALB, us-east-1 CloudFront)
│       ├── ec2_backend/ (Private EC2 nodes, launch template, IAM instance profile, user-data swap & nginx)
│       ├── rds/ (PostgreSQL 16 in private DB subnets, KMS encryption, deletion protection)
│       ├── s3_cloudfront_frontend/ (Private S3, CloudFront OAC, SPA routing 403/404 -> /index.html)
│       └── observability/ (CloudWatch Log Group, metric filters [ERROR], SNS alarm)
├── scripts/
│   ├── deploy-backend.sh (Synchronous SSM rolling Blue/Green deployment)
│   ├── deploy-frontend.sh (Two-phase atomic S3 sync & CloudFront invalidation)
│   └── rollback.sh (SSM Parameter Store previous tag rapid rollback < 2 min)
├── docker-compose.yml
├── Jenkinsfile
├── tests/
│   ├── e2e/
│   │   ├── runner.js (or test harness runner)
│   │   ├── tier1_feature/
│   │   ├── tier2_boundary/
│   │   ├── tier3_combination/
│   │   └── tier4_workload/
└── TEST_INFRA.md
```
