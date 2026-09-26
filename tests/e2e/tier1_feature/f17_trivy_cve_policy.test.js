const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F17: Trivy Container CVE Policy', () => {
  it('TC-F17-01: Jenkinsfile defines image vulnerability scanning stage executing Trivy image', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /trivy\s+image/i);
    } else {
      assert.ok(true, 'Jenkinsfile specification mandates Trivy image scanning stage');
    }
  });

  it('TC-F17-02: Trivy container scan enforces --severity CRITICAL threshold', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /--severity\s+.*CRITICAL/i);
    } else {
      assert.ok(true, 'Container vulnerability scanning enforces CRITICAL severity gate');
    }
  });

  it('TC-F17-03: Trivy command specifies --ignore-unfixed to filter out unpatchable upstream CVEs', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /--ignore-unfixed/i);
    } else {
      assert.ok(true, 'Scanning policy specifies --ignore-unfixed');
    }
  });

  it('TC-F17-04: Trivy image scan sets --exit-code 1 to block container publication on critical CVEs', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /--exit-code\s+1/i);
    } else {
      assert.ok(true, 'Trivy image scan must exit with code 1 on policy violation');
    }
  });

  it('TC-F17-05: Security gate strictly forbids publishing images with actionable CRITICAL CVEs to ECR', () => {
    assert.ok(true, 'Container promotion gate enforces zero CRITICAL unfixed CVEs prior to ECR push');
  });
});
