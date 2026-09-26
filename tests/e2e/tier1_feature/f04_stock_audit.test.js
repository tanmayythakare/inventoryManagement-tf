const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateStockAuditLog } = require('../helpers/contract-validators');

describe('Tier 1 - F04: Mathematical Stock Audit Logging', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-F04-01: Order confirmation automatically inserts a corresponding stock audit log record', async () => {
    await client.confirmOrder(101);
    const logs = client.simulated.auditLogs;
    assert.ok(logs.length > 0, 'Audit log record must be inserted');
    const latest = logs[logs.length - 1];
    validateStockAuditLog(latest);
    assert.strictEqual(latest.orderId, 101);
    assert.strictEqual(latest.productId, 1);
  });

  it('TC-F04-02: Stock reservation audit record specifies operationType RESERVE with zero quantityDelta and positive reservedQuantityDelta', async () => {
    await client.confirmOrder(101); // requests 2 units
    const latest = client.simulated.auditLogs[client.simulated.auditLogs.length - 1];
    assert.strictEqual(latest.operationType, 'RESERVE');
    assert.strictEqual(latest.quantityDelta, 0);
    assert.strictEqual(latest.reservedQuantityDelta, 2);
  });

  it('TC-F04-03: Audit log captures post-transaction snapshots of newQuantity and newReservedQuantity', async () => {
    const initialProduct = await client.getProductById(1);
    await client.confirmOrder(101);
    const latest = client.simulated.auditLogs[client.simulated.auditLogs.length - 1];
    assert.strictEqual(latest.newQuantity, initialProduct.quantity);
    assert.strictEqual(latest.newReservedQuantity, initialProduct.reservedQuantity + 2);
  });

  it('TC-F04-04: Failed order confirmations do not write corrupted or dangling audit records', async () => {
    const logsBefore = client.simulated.auditLogs.length;
    // Attempt invalid confirmation
    try {
      await client.confirmOrder(999); // Non-existent order
    } catch (err) {
      // Expected
    }
    const logsAfter = client.simulated.auditLogs.length;
    assert.strictEqual(logsBefore, logsAfter, 'No audit logs should be written on aborted transactions');
  });

  it('TC-F04-05: Audit records are assigned monotonic sequential IDs and valid UTC timestamps', async () => {
    await client.confirmOrder(101);
    await client.confirmOrder(102);
    const logs = client.simulated.auditLogs;
    assert.ok(logs.length >= 2);
    assert.ok(logs[logs.length - 1].id > logs[logs.length - 2].id);
    assert.ok(new Date(logs[logs.length - 1].createdAt).getTime() > 0);
  });
});
