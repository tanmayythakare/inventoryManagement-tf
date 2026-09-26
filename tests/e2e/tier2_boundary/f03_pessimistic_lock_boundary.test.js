const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');

describe('Tier 2 - F03 Boundary: Pessimistic Lock Stock Reservation Edge Cases', () => {
  beforeEach(() => {
    client.reset();
  });

  it('TC-B03-01: Confirming non-existent order ID returns HTTP 404 Not Found', async () => {
    try {
      await client.confirmOrder(88888);
      assert.fail('Should fail on unknown order ID');
    } catch (err) {
      assert.strictEqual(err.status, 404);
      assert.strictEqual(err.code, 'NOT_FOUND');
    }
  });

  it('TC-B03-02: Confirming an order already in CONFIRMED state returns HTTP 400 Bad Request', async () => {
    await client.confirmOrder(101); // First confirmation succeeds
    try {
      await client.confirmOrder(101); // Second confirmation attempt must fail
      assert.fail('Should reject re-confirming already CONFIRMED order');
    } catch (err) {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.code, 'INVALID_ORDER_STATE');
    }
  });

  it('TC-B03-03: Confirming an order in CANCELLED state returns HTTP 400 Bad Request', async () => {
    const cancelledOrder = {
      id: 104,
      userId: 1,
      status: 'CANCELLED',
      items: [{ productId: 1, quantity: 1, unitPrice: 49.99 }],
      totalAmount: 49.99,
      createdAt: new Date().toISOString()
    };
    client.simulated.orders.set(104, cancelledOrder);

    try {
      await client.confirmOrder(104);
      assert.fail('Should reject confirming CANCELLED order');
    } catch (err) {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.code, 'INVALID_ORDER_STATE');
    }
  });

  it('TC-B03-04: Order confirmation requesting zero or negative quantity is rejected with HTTP 400', async () => {
    const invalidQtyOrder = {
      id: 105,
      userId: 1,
      status: 'PENDING',
      items: [{ productId: 1, quantity: -5, unitPrice: 49.99 }],
      totalAmount: 0,
      createdAt: new Date().toISOString()
    };
    client.simulated.orders.set(105, invalidQtyOrder);

    try {
      await client.confirmOrder(105);
      assert.fail('Should reject negative quantity order item');
    } catch (err) {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.code, 'INVALID_QUANTITY');
    }
  });

  it('TC-B03-05: Requesting quantity exceeding available stock returns HTTP 409 Conflict with detailed shortfall info', async () => {
    // Product 3 has available: 1. Create order requesting 5 units.
    const excessOrder = {
      id: 106,
      userId: 1,
      status: 'PENDING',
      items: [{ productId: 3, quantity: 5, unitPrice: 199.99 }],
      totalAmount: 999.95,
      createdAt: new Date().toISOString()
    };
    client.simulated.orders.set(106, excessOrder);

    try {
      await client.confirmOrder(106);
      assert.fail('Should reject order with insufficient stock');
    } catch (err) {
      assert.strictEqual(err.status, 409);
      assert.strictEqual(err.code, 'INSUFFICIENT_STOCK');
      assert.strictEqual(err.requested, 5);
      assert.strictEqual(err.available, 1);
    }
  });
});
