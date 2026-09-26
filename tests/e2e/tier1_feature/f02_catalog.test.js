const { describe, it, assert } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateProduct } = require('../helpers/contract-validators');

describe('Tier 1 - F02: Product Catalog (/api/v1/products)', () => {
  it('TC-F02-01: Catalog endpoint returns array of products with HTTP 200 OK', async () => {
    const products = await client.getProducts();
    assert.ok(Array.isArray(products), 'Products must be an array');
    assert.ok(products.length >= 3, 'Must contain at least initial seed products');
  });

  it('TC-F02-02: Every catalog item satisfies data contract schema and non-negative constraints', async () => {
    const products = await client.getProducts();
    for (const product of products) {
      validateProduct(product);
    }
  });

  it('TC-F02-03: Mathematical stock invariant holds: availableQuantity equals quantity minus reservedQuantity', async () => {
    const products = await client.getProducts();
    for (const p of products) {
      assert.strictEqual(
        p.availableQuantity,
        p.quantity - p.reservedQuantity,
        `Invariant failure for SKU ${p.sku}`
      );
    }
  });

  it('TC-F02-04: Single product lookup by ID returns exact product details', async () => {
    const product = await client.getProductById(1);
    validateProduct(product);
    assert.strictEqual(product.id, 1);
    assert.strictEqual(product.sku, 'PROD-WIDGET-001');
    assert.strictEqual(product.price, 49.99);
  });

  it('TC-F02-05: Catalog includes seed product PROD-EDGE-003 designated for concurrency tests', async () => {
    const products = await client.getProducts();
    const edgeProd = products.find(p => p.sku === 'PROD-EDGE-003');
    assert.ok(edgeProd, 'PROD-EDGE-003 must be present in catalog');
    assert.strictEqual(edgeProd.quantity, 1);
    assert.strictEqual(edgeProd.reservedQuantity, 0);
    assert.strictEqual(edgeProd.availableQuantity, 1);
  });
});
