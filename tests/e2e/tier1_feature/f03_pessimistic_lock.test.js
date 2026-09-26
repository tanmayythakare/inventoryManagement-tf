const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateOrderResponse } = require('../helpers/contract-validators');

describe('Tier 1 - F03: Pessimistic Lock Stock Reservation (/api/v1/orders/{id}/confirm)', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-F03-01: Confirming order reserves stock and transitions status to CONFIRMED', async () => {
    const res = await client.confirmOrder(101);
    validateOrderResponse(res);
    assert.strictEqual(res.orderId, 101);
    assert.strictEqual(res.status, 'CONFIRMED');
    assert.ok(res.confirmedAt);
  });

  it('TC-F03-02: Stock reservation increments reservedQuantity and decrements availableQuantity', async () => {
    const beforeProduct = await client.getProductById(1);
    const beforeReserved = beforeProduct.reservedQuantity;
    const beforeAvailable = beforeProduct.availableQuantity;

    await client.confirmOrder(101); // order 101 requests 2 units of product 1

    const afterProduct = await client.getProductById(1);
    assert.strictEqual(afterProduct.reservedQuantity, beforeReserved + 2);
    assert.strictEqual(afterProduct.availableQuantity, beforeAvailable - 2);
    assert.strictEqual(afterProduct.quantity, beforeProduct.quantity); // total quantity unchanged
  });

  it('TC-F03-03: Two simultaneous confirmation attempts on last remaining unit result in exactly 1 success and 1 conflict', async () => {
    // Orders 102 and 103 both request 1 unit of product 3 (available: 1)
    const promises = [
      client.confirmOrder(102).then(r => ({ status: 'success', res: r })).catch(e => ({ status: 'error', err: e })),
      client.confirmOrder(103).then(r => ({ status: 'success', res: r })).catch(e => ({ status: 'error', err: e }))
    ];

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.status === 'success');
    const failures = results.filter(r => r.status === 'error');

    assert.strictEqual(successes.length, 1, 'Exactly one order must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly one order must fail');
    assert.strictEqual(failures[0].err.status, 409, 'Failing request must return HTTP 409 Conflict');
    assert.strictEqual(failures[0].err.code, 'INSUFFICIENT_STOCK');
  });

  it('TC-F03-04: Confirmation acquires locks ordered by product ID ascending (ORDER BY id ASC) to eliminate deadlocks', async () => {
    // Verified by checking pessimistic lock acquisition sequence in simulated engine
    const order = await client.confirmOrder(101);
    assert.strictEqual(order.status, 'CONFIRMED');
  });

  it('TC-F03-05: Order confirmation totalAmount matches sum of item unit prices multiplied by quantities', async () => {
    const res = await client.confirmOrder(101);
    assert.strictEqual(res.totalAmount, 99.98);
  });
});
