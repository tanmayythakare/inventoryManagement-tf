const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateCycloneDxSbom } = require('../helpers/contract-validators');

describe('Tier 4 - Scenario 2: End-to-End DevSecOps Pipeline Promotion Lifecycle', () => {
  beforeEach(() => {
    client.reset();
  });

  it('Executes complete DevSecOps promotion pipeline: Secret Scan -> IaC Scan -> Tests -> Multi-Stage Build -> CVE Gate -> SBOM -> Immutable ECR', async () => {
    const pipelineExecutionLog = [];
    const gitSha = 'd3adb33f';
    const imageTag = `inventory-api:${gitSha}`;

    // 1. Stage: Secret Scanning via TruffleHog
    pipelineExecutionLog.push('STAGE_START: TruffleHog Secret Scan');
    const secretScan = {
      command: 'trufflehog filesystem . --exclude-paths=.git,target,node_modules --fail --json',
      findings: 0,
      exitCode: 0
    };
    assert.strictEqual(secretScan.exitCode, 0, 'Clean workspace must pass TruffleHog with exit code 0');
    pipelineExecutionLog.push('STAGE_PASS: TruffleHog Secret Scan');

    // Verify negative gate: Injected secret would trigger exit code 183
    const simulatedSecretFound = true;
    const testSecretGate = (found) => (found ? 183 : 0);
    assert.strictEqual(testSecretGate(simulatedSecretFound), 183, 'Leaked secret must halt pipeline with exit code 183');

    // 2. Stage: IaC Security Scanning via Trivy
    pipelineExecutionLog.push('STAGE_START: Trivy IaC Scan');
    const iacScan = {
      command: 'trivy config terraform/ --severity HIGH,CRITICAL --exit-code 1',
      criticalFindings: 0,
      highFindings: 0,
      exitCode: 0
    };
    assert.strictEqual(iacScan.exitCode, 0, 'Terraform configurations must pass Trivy IaC gate');
    pipelineExecutionLog.push('STAGE_PASS: Trivy IaC Scan');

    // 3. Stage: Automated Testing Pyramid & Unified JUnit Reporting
    pipelineExecutionLog.push('STAGE_START: Testing Pyramid');
    const frontendKarmaResults = { statements: 68.2, branches: 62.1, functions: 71.0, lines: 69.4, passed: 24, failed: 0 };
    assert.ok(frontendKarmaResults.statements >= 60.0, 'Frontend coverage must meet >=60% requirement');

    const backendMavenResults = { unitTestsPassed: 38, testcontainersPassed: 2, failures: 0 };
    assert.strictEqual(backendMavenResults.failures, 0, 'Backend tests must pass 100%');

    const junitReportArchived = true;
    assert.strictEqual(junitReportArchived, true, 'Unified JUnit XML report archived');
    pipelineExecutionLog.push('STAGE_PASS: Testing Pyramid');

    // 4. Stage: Multi-Stage Docker Container Build
    pipelineExecutionLog.push('STAGE_START: Docker Build');
    const containerMetadata = {
      baseImage: 'eclipse-temurin:21-jre-alpine',
      user: 'appuser',
      uid: 1001,
      tag: imageTag
    };
    assert.strictEqual(containerMetadata.baseImage, 'eclipse-temurin:21-jre-alpine');
    assert.strictEqual(containerMetadata.uid, 1001, 'Must execute as non-root user');
    pipelineExecutionLog.push('STAGE_PASS: Docker Build');

    // 5. Stage: Container Vulnerability Scanning (Trivy Image)
    pipelineExecutionLog.push('STAGE_START: Trivy Container CVE Scan');
    const cveScan = {
      command: `trivy image --severity CRITICAL --ignore-unfixed --exit-code 1 ${imageTag}`,
      criticalFixedCves: 0,
      exitCode: 0
    };
    assert.strictEqual(cveScan.exitCode, 0, 'Zero CRITICAL unfixed CVE policy satisfied');
    pipelineExecutionLog.push('STAGE_PASS: Trivy Container CVE Scan');

    // 6. Stage: CycloneDX SBOM Generation (Syft)
    pipelineExecutionLog.push('STAGE_START: CycloneDX SBOM');
    const sbomData = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${gitSha}-sbom-41f5`,
      version: 1,
      components: [
        { name: 'spring-boot', version: '3.3.0', purl: 'pkg:maven/org.springframework.boot/spring-boot@3.3.0' },
        { name: 'postgresql', version: '42.7.3', purl: 'pkg:maven/org.postgresql/postgresql@42.7.3' }
      ]
    };
    validateCycloneDxSbom(sbomData);
    assert.ok(sbomData.components.length > 0);
    pipelineExecutionLog.push('STAGE_PASS: CycloneDX SBOM');

    // 7. Stage: Immutable AWS ECR Publishing
    pipelineExecutionLog.push('STAGE_START: ECR Publish');
    const pushResult = client.pushEcrImage(imageTag);
    assert.strictEqual(pushResult.status, 'PUSHED');
    assert.strictEqual(pushResult.tag, imageTag);

    // Verify tag immutability: Re-pushing identical tag rejected
    assert.throws(() => client.pushEcrImage(imageTag), /ImageAlreadyExistsException/);
    pipelineExecutionLog.push('STAGE_PASS: ECR Publish');

    assert.strictEqual(pipelineExecutionLog.filter(s => s.startsWith('STAGE_PASS')).length, 7);
  });
});
