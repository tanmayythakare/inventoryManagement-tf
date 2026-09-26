const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateHealthResponse } = require('../helpers/contract-validators');

describe('Tier 1 - F05: Actuator Health Probes (/actuator/health)', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-F05-01: Actuator health endpoint returns HTTP 200 with status UP under nominal conditions', async () => {
    const health = await client.getHealth();
    validateHealthResponse(health);
    assert.strictEqual(health.status, 'UP');
    assert.strictEqual(health.httpStatus, 200);
  });

  it('TC-F05-02: Health check includes database subcomponent reporting PostgreSQL UP', async () => {
    const health = await client.getHealth();
    assert.ok(health.components, 'Components block must be present');
    assert.ok(health.components.db, 'db subcomponent must be present');
    assert.strictEqual(health.components.db.status, 'UP');
    assert.strictEqual(health.components.db.details.database, 'PostgreSQL');
  });

  it('TC-F05-03: Health check includes diskSpace subcomponent reporting UP', async () => {
    const health = await client.getHealth();
    assert.ok(health.components.diskSpace, 'diskSpace subcomponent must be present');
    assert.strictEqual(health.components.diskSpace.status, 'UP');
  });

  it('TC-F05-04: Simulated database failure transitions overall health status to DOWN with HTTP 503', async () => {
    client.setDbHealth('DOWN');
    const health = await client.getHealth();
    assert.strictEqual(health.status, 'DOWN');
    assert.strictEqual(health.httpStatus, 503);
    assert.strictEqual(health.components.db.status, 'DOWN');
  });

  it('TC-F05-05: Health probe is accessible without authentication to allow ALB / Docker health monitoring', async () => {
    // Actuator health probe does not require Bearer token
    const health = await client.getHealth();
    assert.ok(health.status === 'UP' || health.status === 'DOWN');
  });
});
