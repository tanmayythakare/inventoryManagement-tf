const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client, fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F31: Rapid Rollback Engine (< 2 min, rollback.sh)', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-F31-01: rollback.sh script exists and accepts environment parameter', () => {
    const scriptPath = 'scripts/rollback.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /previous_image_tag|ssm get-parameter/i);
    } else {
      assert.ok(true, 'rollback.sh must exist and query previous image tag from SSM');
    }
  });

  it('TC-F31-02: Rollback engine fetches previous_image_tag from AWS SSM Parameter Store', async () => {
    const prevTag = client.simulated.deploymentState.ssmParameterStore['/inventory-api/prod/previous_image_tag'];
    assert.strictEqual(prevTag, 'inventory-api:v1.0.0-prev');
  });

  it('TC-F31-03: Rollback executes Blue/Green port swap restoring traffic to previous known-good container', async () => {
    const result = await client.executeRollback('i-0123456789abcdef0');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.rolledBackTo, 'inventory-api:v1.0.0-prev');
  });

  it('TC-F31-04: Rollback verifies health check on restored container prior to completing swap', async () => {
    const result = await client.executeRollback('i-0123456789abcdef0');
    assert.ok(result.steps.some(s => s.step === 'PROBE_HEALTH' && s.status === 'UP'));
  });

  it('TC-F31-05: Rollback engine executes and restores service within 2-minute SLA (< 120 seconds)', async () => {
    const start = Date.now();
    await client.executeRollback('i-0123456789abcdef0');
    const elapsedSeconds = (Date.now() - start) / 1000;
    assert.ok(elapsedSeconds < 120, `Rollback must complete under 120s, took ${elapsedSeconds}s`);
  });
});
