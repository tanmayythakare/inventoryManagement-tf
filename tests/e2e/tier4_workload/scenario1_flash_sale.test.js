const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateOrderResponse, validateStockAuditLog } = require('../helpers/contract-validators');

describe('Tier 4 - Scenario 1: High-Concurrency Flash Sale (Pessimistic Locking & Zero Overselling)', () => {
  beforeEach(() => {
    client.reset();
  });

  it('Executes high-concurrency flash sale: 50 concurrent buyers competing for 1 remaining unit', async () => {
    // 1. Initial State Verification
    const initialProduct = await client.getProductById(3);
    assert.strictEqual(initialProduct.sku, 'PROD-EDGE-003');
    assert.strictEqual(initialProduct.quantity, 1);
    assert.strictEqual(initialProduct.reservedQuantity, 0);
    assert.strictEqual(initialProduct.availableQuantity, 1);

    // 2. Prepare 50 concurrent orders
    const concurrentCount = 50;
    const orderIds = [];

    for (let i = 1; i <= concurrentCount; i++) {
      const orderId = 2000 + i;
      orderIds.push(orderId);
      client.simulated.orders.set(orderId, {
        id: orderId,
        userId: (i % 2) + 1,
        status: 'PENDING',
        items: [{ productId: 3, quantity: 1, unitPrice: 199.99 }],
        totalAmount: 199.99,
        createdAt: new Date().toISOString()
      });
    }

    // 3. Launch 50 simultaneous confirmation requests
    const promises = orderIds.map(id =>
      client.confirmOrder(id)
        .then(res => ({ orderId: id, success: true, res }))
        .catch(err => ({ orderId: id, success: false, err }))
    );

    const outcomes = await Promise.all(promises);

    // 4. Concurrency Guardrail Assertions
    const successfulOrders = outcomes.filter(o => o.success);
    const conflictingOrders = outcomes.filter(o => !o.success);

    assert.strictEqual(
      successfulOrders.length,
      1,
      `Pessimistic locking violated: Expected exactly 1 successful confirmation, but got ${successfulOrders.length}`
    );
    assert.strictEqual(
      conflictingOrders.length,
      concurrentCount - 1,
      `Expected ${concurrentCount - 1} 409 Conflict rejections, but got ${conflictingOrders.length}`
    );

    // Validate winning order contract
    validateOrderResponse(successfulOrders[0].res);
    assert.strictEqual(successfulOrders[0].res.status, 'CONFIRMED');

    // Validate losing orders returned HTTP 409 INSUFFICIENT_STOCK
    for (const conflict of conflictingOrders) {
      assert.strictEqual(conflict.err.status, 409);
      assert.strictEqual(conflict.err.code, 'INSUFFICIENT_STOCK');
    }

    // 5. Database State & Invariant Verification
    const finalProduct = await client.getProductById(3);
    assert.strictEqual(finalProduct.quantity, 1, 'Total physical inventory must remain 1');
    assert.strictEqual(finalProduct.reservedQuantity, 1, 'Reserved quantity must be exactly 1');
    assert.strictEqual(finalProduct.availableQuantity, 0, 'Available quantity must be exactly 0 (no overselling)');

    // 6. Mathematical Audit Log Verification
    const auditLogsForProd3 = client.simulated.auditLogs.filter(l => l.productId === 3);
    assert.strictEqual(
      auditLogsForProd3.length,
      1,
      `Audit log invariant violated: Expected exactly 1 audit entry for reserved item, got ${auditLogsForProd3.length}`
    );

    validateStockAuditLog(auditLogsForProd3[0]);
    assert.strictEqual(auditLogsForProd3[0].operationType, 'RESERVE');
    assert.strictEqual(auditLogsForProd3[0].reservedQuantityDelta, 1);
    assert.strictEqual(auditLogsForProd3[0].newQuantity, 1);
    assert.strictEqual(auditLogsForProd3[0].newReservedQuantity, 1);
  });
});
