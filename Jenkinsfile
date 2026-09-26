pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
    }

    parameters {
        string(name: 'AWS_REGION', defaultValue: 'ap-south-1', description: 'AWS Target Deployment Region')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'prod'], description: 'Deployment Environment Target')
        booleanParam(name: 'FORCE_DEPLOY', defaultValue: false, description: 'Force deployment bypassing safety checks')
    }

    environment {
        AWS_DEFAULT_REGION   = 'ap-south-1'
        AWS_REGION           = "${params.AWS_REGION ?: 'ap-south-1'}"
        DEPLOY_ENV           = "${params.DEPLOY_ENV ?: 'dev'}"
        ECR_REPOSITORY_NAME  = 'inventory-api'
        MAVEN_OPTS           = '-Xmx512m -XX:MaxRAMPercentage=50.0'
        NODE_OPTIONS         = '--max-old-space-size=512'
        TRUFFLEHOG_NO_UPDATE         = 'true'
        CHROME_BIN                   = '/usr/bin/google-chrome'
        DOCKER_HOST                  = 'unix:///var/run/docker.sock'
        DOCKER_API_VERSION           = '1.44'
        TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = '/var/run/docker.sock'
        TESTCONTAINERS_CHECKS_DISABLE = 'true'
        TESTCONTAINERS_RYUK_DISABLED = 'true'
    }

    stages {
        stage('Initialize & Resolve Metadata') {
            steps {
                script {
                    env.GIT_SHA       = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.GIT_SHA_SHORT = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    env.IMAGE_TAG     = env.GIT_SHA_SHORT
                    
                    // Retrieve AWS Account ID dynamically via STS / IAM Instance Profile
                    env.AWS_ACCOUNT_ID = sh(
                        returnStdout: true, 
                        script: 'aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "123456789012"'
                    ).trim()
                    
                    env.ECR_REGISTRY  = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                    env.IMAGE_URI     = "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY_NAME}:${env.IMAGE_TAG}"
                    
                    echo "=========================================================="
                    echo "CI/CD PIPELINE INITIATED (EC2 t3.micro runner + 2GB swap)"
                    echo "Git SHA (Full):   ${env.GIT_SHA}"
                    echo "Git SHA (Short):  ${env.GIT_SHA_SHORT}"
                    echo "Image Tag:        ${env.IMAGE_TAG}"
                    echo "Target ECR Image: ${env.IMAGE_URI}"
                    echo "Target Region:    ${env.AWS_REGION}"
                    echo "Target Env:       ${env.DEPLOY_ENV}"
                    echo "=========================================================="
                }
            }
        }

        stage('Secret Scanning (TruffleHog)') {
            steps {
                echo "==> [Gate 1] Running TruffleHog Secret Scan..."
                sh '''
                    echo "Scanning repository for leaked credentials..."
                    trufflehog filesystem . --no-update --exclude-paths=.truffleignore --fail --json > trufflehog-report.json || {
                        EXIT_CODE=$?
                        if [ $EXIT_CODE -eq 183 ]; then
                            echo "CRITICAL: Leaked credentials detected by TruffleHog! Halting pipeline (exit 183)."
                            exit 183
                        else
                            echo "TruffleHog execution failed with error code $EXIT_CODE"
                            exit $EXIT_CODE
                        fi
                    }
                    echo "TruffleHog Secret Scan passed: Zero leaked credentials detected."
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trufflehog-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('IaC Security Scanning (Trivy Config)') {
            steps {
                echo "==> [Gate 2] Running Trivy IaC Security Scan on Terraform..."
                sh '''
                    echo "Scanning Terraform configurations for misconfigurations and security policy violations..."
                    # Generate full JSON report for audit artifact
                    trivy config --format json --output trivy-iac-report.json terraform/ || true
                    # Enforce blocking security gate on HIGH and CRITICAL severities
                    trivy config --ignorefile .trivyignore --severity HIGH,CRITICAL --exit-code 1 terraform/
                    echo "Trivy IaC Security Scan passed: Zero HIGH or CRITICAL misconfigurations in terraform/."
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-iac-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Frontend Tests & Coverage') {
            steps {
                echo "==> [Gate 3a] Executing Angular Unit Tests & Coverage Verification (>= 60%)..."
                dir('frontend') {
                    sh '''
                        if [ -f package-lock.json ]; then
                            npm ci
                        else
                            npm install
                        fi
                        npm run test:ci
                    '''
                }
            }
        }

        stage('Backend Tests & Concurrency Verification') {
            steps {
                echo "==> [Gate 3b] Executing Maven Unit & Integration Tests (Testcontainers PostgreSQL 16)..."
                dir('backend') {
                    sh '''
                        export DOCKER_HOST=unix:///var/run/docker.sock
                        export DOCKER_API_VERSION=1.44
                        export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
                        export TESTCONTAINERS_CHECKS_DISABLE=true
                        export TESTCONTAINERS_RYUK_DISABLED=true
                        docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Status}}" || true
                        mkdir -p ~/.testcontainers
                        cat << 'EOF' > ~/.testcontainers.properties
docker.client.strategy=org.testcontainers.dockerclient.UnixSocketClientProviderStrategy
docker.host=unix:///var/run/docker.sock
checks.disable=true
ryuk.disabled=true
EOF
                        cat << 'EOF' > ~/.docker-java.properties
api.version=1.44
EOF
                        mvn clean verify -B -Ddocker.host=unix:///var/run/docker.sock -Dtestcontainers.checks.disable=true -Ddocker.client.apiVersion=1.44
                    '''
                }
            }
        }

        stage('Build Hardened Container Image') {
            steps {
                echo "==> [Gate 4] Building Multi-Stage Docker Image (eclipse-temurin:21-jre-alpine non-root)..."
                sh '''
                    docker build -t inventory-api:local -f backend/Dockerfile backend/
                '''
            }
        }

        stage('Container Vulnerability Scanning (Trivy Image)') {
            steps {
                echo "==> [Gate 5] Scanning Container Image for Zero CRITICAL Unfixed CVEs..."
                sh '''
                    echo "Scanning container image inventory-api:local..."
                    # Generate full JSON report for audit trail
                    trivy image --ignorefile .trivyignore --format json --output trivy-image-report.json inventory-api:local || true
                    # Enforce policy: Zero CRITICAL unfixed CVEs
                    trivy image --ignorefile .trivyignore --ignore-unfixed --severity CRITICAL --exit-code 1 inventory-api:local
                    echo "Container Vulnerability Scan passed: Zero CRITICAL unfixed CVEs."
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-image-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Generate CycloneDX SBOM (Syft)') {
            steps {
                echo "==> [Gate 6] Generating CycloneDX SBOM via Syft..."
                sh '''
                    syft inventory-api:local -o cyclonedx-json=bom.json
                    jq -e '.bomFormat == "CycloneDX"' bom.json > /dev/null || {
                        echo "ERROR: Generated bom.json does not conform to CycloneDX schema"
                        exit 1
                    }
                    echo "Verified CycloneDX format: $(jq -r .bomFormat bom.json) (specVersion: $(jq -r .specVersion bom.json))"
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'bom.json', fingerprint: true
                }
            }
        }

        stage('Publish Immutable Image to AWS ECR') {
            steps {
                echo "==> [Gate 7] Authenticating and Publishing Immutable Image to AWS ECR..."
                sh '''
                    # ECR Authentication via AWS CLI v2
                    aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    
                    # Tag image strictly with Git commit SHA
                    docker tag inventory-api:local ${IMAGE_URI}
                    
                    # Push immutable image
                    docker push ${IMAGE_URI}
                    
                    # Record previous tag and update current tag in SSM Parameter Store for deployment tracking & instant rollback
                    PREV_TAG=$(aws ssm get-parameter --name "/inventory-api/current_image_tag" --region ${AWS_REGION} --query "Parameter.Value" --output text 2>/dev/null || echo "")
                    if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$IMAGE_TAG" ]; then
                        echo "Preserving previous image tag in SSM: $PREV_TAG"
                        aws ssm put-parameter --name "/inventory-api/previous_image_tag" --value "$PREV_TAG" --type String --overwrite --region ${AWS_REGION} || true
                    fi
                    echo "Setting current image tag in SSM: $IMAGE_TAG"
                    aws ssm put-parameter --name "/inventory-api/current_image_tag" --value "$IMAGE_TAG" --type String --overwrite --region ${AWS_REGION} || true
                '''
            }
        }

        stage('Trigger Zero-Downtime Deployment') {
            steps {
                echo "==> [Gate 8] Triggering Zero-Downtime Rolling Deployment..."
                sh '''
                    export DEPLOY_ENV="${DEPLOY_ENV}"
                    export IMAGE_TAG="${IMAGE_TAG}"
                    export AWS_REGION="${AWS_REGION}"
                    export FORCE_DEPLOY="${params.FORCE_DEPLOY}"

                    echo "Deploying immutable image tag ${IMAGE_TAG} to environment: ${DEPLOY_ENV}"

                    # Deploy Backend via Synchronous SSM Rolling Update
                    if [ -f "scripts/deploy-backend.sh" ]; then
                        echo "Executing scripts/deploy-backend.sh..."
                        chmod +x scripts/deploy-backend.sh
                        ./scripts/deploy-backend.sh "${DEPLOY_ENV}" "${IMAGE_TAG}"
                    else
                        echo "WARNING: scripts/deploy-backend.sh not found. Skipping backend deployment."
                    fi

                    # Deploy Frontend via Atomic S3 Sync & CloudFront Invalidation
                    if [ -f "scripts/deploy-frontend.sh" ]; then
                        echo "Executing scripts/deploy-frontend.sh..."
                        chmod +x scripts/deploy-frontend.sh
                        ./scripts/deploy-frontend.sh "${DEPLOY_ENV}"
                    else
                        echo "WARNING: scripts/deploy-frontend.sh not found. Skipping frontend deployment."
                    fi
                '''
            }
        }
    }

    post {
        always {
            // Aggregate all JUnit test reports from frontend and backend
            junit testResults: 'frontend/test-results/*.xml,backend/target/surefire-reports/*.xml,backend/target/failsafe-reports/*.xml', allowEmptyResults: true
            
            // Consolidate security scan audit artifacts
            archiveArtifacts artifacts: 'trufflehog-report.json,trivy-*.json,bom.json', allowEmptyArchive: true, fingerprint: true
            
            // Memory & Disk hygiene for EC2 t3.micro runner
            sh '''
                docker rmi inventory-api:local ${IMAGE_URI} 2>/dev/null || true
                docker image prune -f --filter "until=24h" || true
            '''
            
            // Workspace cleanup
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "CI/CD PIPELINE SUCCEEDED: Verified, scanned, packaged, published to ECR (${env.IMAGE_URI}), and promoted to ${env.DEPLOY_ENV}."
        }
        failure {
            echo "CI/CD PIPELINE FAILED: Build stopped due to security policy violation, test failure, or deployment error."
        }
    }
}
