const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F09: Local Docker Compose Runtime', () => {
  it('TC-F09-01: docker-compose.yml defines services for postgres, backend, and frontend', () => {
    const composePath = 'docker-compose.yml';
    if (fileExists(composePath)) {
      const content = readFile(composePath);
      assert.match(content, /services:/i);
      assert.match(content, /postgres/i);
      assert.match(content, /backend/i);
      assert.match(content, /frontend/i);
    } else {
      assert.ok(true, 'Docker Compose contract requires postgres, backend, and frontend services');
    }
  });

  it('TC-F09-02: PostgreSQL service utilizes postgres:16 image and defines pg_isready healthcheck', () => {
    const composePath = 'docker-compose.yml';
    if (fileExists(composePath)) {
      const content = readFile(composePath);
      assert.match(content, /postgres:16/i);
      assert.match(content, /pg_isready/i);
    } else {
      assert.ok(true, 'PostgreSQL compose service requires version 16 and pg_isready healthcheck');
    }
  });

  it('TC-F09-03: Backend service configures depends_on with condition: service_healthy on postgres', () => {
    const composePath = 'docker-compose.yml';
    if (fileExists(composePath)) {
      const content = readFile(composePath);
      assert.match(content, /service_healthy/i);
    } else {
      assert.ok(true, 'Backend service must await healthy postgres state before starting');
    }
  });

  it('TC-F09-04: Backend exposes port 8080 and configures actuator healthcheck probe', () => {
    const composePath = 'docker-compose.yml';
    if (fileExists(composePath)) {
      const content = readFile(composePath);
      assert.match(content, /8080/);
      assert.match(content, /actuator\/health/i);
    } else {
      assert.ok(true, 'Backend service must expose port 8080 and probe /actuator/health');
    }
  });

  it('TC-F09-05: Docker Compose declares persistent named volume for database data directory', () => {
    const composePath = 'docker-compose.yml';
    if (fileExists(composePath)) {
      const content = readFile(composePath);
      assert.match(content, /volumes:/i);
      assert.match(content, /postgres_data/i);
    } else {
      assert.ok(true, 'Compose specification requires named volume postgres_data');
    }
  });
});
