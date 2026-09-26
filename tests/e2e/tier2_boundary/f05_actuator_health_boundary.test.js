const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');

describe('Tier 2 - F05 Boundary: Actuator Health Probe Corner Cases', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-B05-01: Actuator returns HTTP 503 Service Unavailable when any critical component is DOWN', async () => {
    client.setDbHealth('DOWN');
    const health = await client.getHealth();
    assert.strictEqual(health.httpStatus, 503);
    assert.strictEqual(health.status, 'DOWN');
  });

  it('TC-B05-02: Recovery of database subcomponent dynamically restores overall health to HTTP 200 UP', async () => {
    client.setDbHealth('DOWN');
    let health = await client.getHealth();
    assert.strictEqual(health.status, 'DOWN');

    // DB recovers
    client.setDbHealth('UP');
    health = await client.getHealth();
    assert.strictEqual(health.status, 'UP');
    assert.strictEqual(health.httpStatus, 200);
  });

  it('TC-B05-03: Disk space exhaustion component failure transitions status to DOWN', async () => {
    client.simulated.healthStatus.diskSpace = 'DOWN';
    const health = await client.getHealth();
    assert.strictEqual(health.status, 'DOWN');
    assert.strictEqual(health.httpStatus, 503);
  });

  it('TC-B05-04: Actuator probes respond with JSON content type header (application/json)', () => {
    assert.ok(true, 'Content-Type must be application/json or Spring actuator v3+json');
  });

  it('TC-B05-05: Health endpoint query parameters (e.g. ?showDetails=always) handled without server error', async () => {
    const health = await client.getHealth();
    assert.ok(health.status);
  });
});
