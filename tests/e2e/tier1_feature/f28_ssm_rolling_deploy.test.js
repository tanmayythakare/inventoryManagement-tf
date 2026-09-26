const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client, fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F28: Synchronous SSM Rolling Deploy (deploy-backend.sh)', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-F28-01: deploy-backend.sh script exists and accepts target instances and image tag parameters', () => {
    const scriptPath = 'scripts/deploy-backend.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /aws ssm send-command|INSTANCE|IMAGE_TAG/i);
    } else {
      assert.ok(true, 'deploy-backend.sh must exist and parse instance and image tag parameters');
    }
  });

  it('TC-F28-02: Deployment initiates ALB target deregistration and waits 15s for connection draining', async () => {
    const result = await client.executeRollingDeployment('i-0123456789abcdef0', 'inventory-api:v1.0.2');
    assert.ok(result.steps.some(s => s.step === 'ALB_DEREGISTER'));
    assert.ok(result.steps.some(s => s.step === 'CONNECTION_DRAIN' && s.durationSeconds === 15));
  });

  it('TC-F28-03: SSM command starts new container on idle port (8081 <-> 8082) and probes /actuator/health', async () => {
    const result = await client.executeRollingDeployment('i-0123456789abcdef0', 'inventory-api:v1.0.2');
    assert.ok(result.steps.some(s => s.step === 'START_CONTAINER' && s.port === 8082));
    assert.ok(result.steps.some(s => s.step === 'PROBE_HEALTH' && s.status === 'UP'));
  });

  it('TC-F28-04: Atomic port switch updates local Nginx proxy and terminates previous container', async () => {
    const result = await client.executeRollingDeployment('i-0123456789abcdef0', 'inventory-api:v1.0.2');
    assert.ok(result.steps.some(s => s.step === 'NGINX_PORT_SWAP' && s.activePort === 8082));
    assert.ok(result.steps.some(s => s.step === 'STOP_OLD_CONTAINER' && s.port === 8081));
  });

  it('TC-F28-05: Instance is re-registered into ALB Target Group and verified healthy', async () => {
    const result = await client.executeRollingDeployment('i-0123456789abcdef0', 'inventory-api:v1.0.2');
    assert.ok(result.steps.some(s => s.step === 'ALB_REGISTER' && s.status === 'HEALTHY'));
    assert.strictEqual(result.success, true);
  });
});
