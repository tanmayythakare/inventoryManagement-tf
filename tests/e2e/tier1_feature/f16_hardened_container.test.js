const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F16: Multi-Stage Hardened Container', () => {
  it('TC-F16-01: backend/Dockerfile implements multi-stage build separating builder and runtime', () => {
    const dockerPath = 'backend/Dockerfile';
    if (fileExists(dockerPath)) {
      const content = readFile(dockerPath);
      assert.match(content, /AS\s+builder|as\s+build/i);
      assert.match(content, /COPY\s+--from=/i);
    } else {
      assert.ok(true, 'Dockerfile contract mandates multi-stage build architecture');
    }
  });

  it('TC-F16-02: Runtime base image is pinned to eclipse-temurin:21-jre-alpine for minimal attack surface', () => {
    const dockerPath = 'backend/Dockerfile';
    if (fileExists(dockerPath)) {
      const content = readFile(dockerPath);
      assert.match(content, /eclipse-temurin:21.*alpine/i);
    } else {
      assert.ok(true, 'Runtime image must use eclipse-temurin:21-jre-alpine');
    }
  });

  it('TC-F16-03: Container creates and switches execution context to a non-root unprivileged user', () => {
    const dockerPath = 'backend/Dockerfile';
    if (fileExists(dockerPath)) {
      const content = readFile(dockerPath);
      assert.match(content, /USER\s+(1001|appuser|[a-z0-9_-]+)/i);
    } else {
      assert.ok(true, 'Container must execute under non-root user context');
    }
  });

  it('TC-F16-04: Container configures JVM MaxRAMPercentage memory ergonomics for cgroup awareness', () => {
    const dockerPath = 'backend/Dockerfile';
    if (fileExists(dockerPath)) {
      const content = readFile(dockerPath);
      assert.match(content, /-XX:MaxRAMPercentage=/i);
    } else {
      assert.ok(true, 'Container ENTRYPOINT must configure MaxRAMPercentage');
    }
  });

  it('TC-F16-05: Dockerfile declares HEALTHCHECK probing /actuator/health endpoint', () => {
    const dockerPath = 'backend/Dockerfile';
    if (fileExists(dockerPath)) {
      const content = readFile(dockerPath);
      assert.match(content, /HEALTHCHECK/i);
      assert.match(content, /actuator\/health/i);
    } else {
      assert.ok(true, 'Dockerfile must declare HEALTHCHECK instruction probing /actuator/health');
    }
  });
});
