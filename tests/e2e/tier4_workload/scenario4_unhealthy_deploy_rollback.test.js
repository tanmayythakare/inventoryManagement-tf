const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');

describe('Tier 4 - Scenario 4: Unhealthy Container Deployment Abort and Rapid Rollback', () => {
  beforeEach(() => {
    client.reset();
  });

  it('Halts deployment of unhealthy container, leaves production undisturbed, and executes rapid rollback < 2 min', async () => {
    const targetInstance = 'i-0123456789abcdef0';
    const initialPort = client.simulated.deploymentState.activePort; // 8081
    const initialColor = client.simulated.deploymentState.activeColor; // blue

    // 1. Attempt deployment with corrupted / unhealthy container
    const corruptedTag = 'inventory-api:unhealthy-tag-fail';
    const deployResult = await client.executeRollingDeployment(targetInstance, corruptedTag);

    // 2. Verify Deployment Abort
    assert.strictEqual(deployResult.success, false, 'Deployment of unhealthy image must report failure');
    assert.ok(deployResult.steps.some(s => s.step === 'DEPLOYMENT_ABORTED'));

    // Production container must NOT have been stopped or port swapped
    assert.strictEqual(client.simulated.deploymentState.activePort, initialPort);
    assert.strictEqual(client.simulated.deploymentState.activeColor, initialColor);

    // Service remains 100% available on original port
    const liveHealth = await client.getHealth();
    assert.strictEqual(liveHealth.status, 'UP');

    // 3. Trigger Rapid Rollback Engine (< 2 min SLA)
    const rollbackStart = Date.now();
    const rollbackResult = await client.executeRollback(targetInstance);
    const rollbackDurationSeconds = (Date.now() - rollbackStart) / 1000;

    assert.strictEqual(rollbackResult.success, true, 'Rollback must complete successfully');
    assert.strictEqual(rollbackResult.rolledBackTo, 'inventory-api:v1.0.0-prev');
    assert.ok(
      rollbackDurationSeconds < 120,
      `Rollback must complete in < 2 minutes (120s), took ${rollbackDurationSeconds}s`
    );

    // 4. Verify Final State after Rollback
    const postRollbackHealth = await client.getHealth();
    assert.strictEqual(postRollbackHealth.status, 'UP');
    assert.strictEqual(postRollbackHealth.httpStatus, 200);
    assert.ok(client.simulated.deploymentState.albTargetGroup.includes(targetInstance));
  });
});
