const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');

describe('Tier 4 - Scenario 3: Zero-Downtime Rolling Update Under Active HTTP Traffic', () => {
  beforeEach(() => {
    client.reset();
  });

  it('Executes zero-downtime rolling update with 0 dropped connections and 0 HTTP 502/504 errors', async () => {
    const targetInstance = 'i-0123456789abcdef0';
    const newVersionTag = 'inventory-api:v1.1.0-release';

    // 1. Initial State: Blue container active on port 8081
    assert.strictEqual(client.simulated.deploymentState.activePort, 8081);
    assert.strictEqual(client.simulated.deploymentState.activeColor, 'blue');

    // 2. Active Traffic Simulation
    let trafficActive = true;
    let successfulRequests = 0;
    let failedRequests = 0;
    const requestErrors = [];

    async function sendTrafficLoop() {
      while (trafficActive) {
        try {
          const health = await client.getHealth();
          if (health.status === 'UP') {
            successfulRequests++;
          } else {
            failedRequests++;
            requestErrors.push(`Unhealthy response: ${health.status}`);
          }
        } catch (err) {
          failedRequests++;
          requestErrors.push(err.message);
        }
        await new Promise(r => setTimeout(r, 5));
      }
    }

    const trafficPromise = sendTrafficLoop();

    // 3. Initiate SSM Synchronous Rolling Deployment
    const deployResult = await client.executeRollingDeployment(targetInstance, newVersionTag);

    // Stop background traffic loop after deployment finishes
    trafficActive = false;
    await trafficPromise;

    // 4. Verify Deployment Steps
    assert.strictEqual(deployResult.success, true, 'Deployment must report success');

    // Check step sequence: Deregister -> Drain 15s -> Start 8082 -> Health UP -> Swap -> Stop 8081 -> Register
    const stepNames = deployResult.steps.map(s => s.step);
    assert.deepStrictEqual(stepNames, [
      'ALB_DEREGISTER',
      'CONNECTION_DRAIN',
      'START_CONTAINER',
      'PROBE_HEALTH',
      'NGINX_PORT_SWAP',
      'STOP_OLD_CONTAINER',
      'ALB_REGISTER'
    ]);

    // 5. Verify Post-Deployment State: Green container active on port 8082
    assert.strictEqual(client.simulated.deploymentState.activePort, 8082);
    assert.strictEqual(client.simulated.deploymentState.activeColor, 'green');
    assert.strictEqual(
      client.simulated.deploymentState.ssmParameterStore['/inventory-api/prod/current_image_tag'],
      newVersionTag
    );

    // 6. Traffic Integrity Verification: Zero 502/504 errors
    assert.ok(successfulRequests > 0, `Must have served active requests during deployment (served: ${successfulRequests})`);
    assert.strictEqual(
      failedRequests,
      0,
      `Zero downtime violated: Observed ${failedRequests} failed requests: ${requestErrors.join(', ')}`
    );
  });
});
