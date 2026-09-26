/**
 * Enterprise Contract Validators
 * Validates REST API schemas, SQL DDL migrations, HCL configurations,
 * Jenkins pipelines, and shell scripts against ORIGINAL_REQUEST.md & PROJECT.md specifications.
 */

const assert = require('assert');

/**
 * Validates JWT access token structure and standard claims
 */
function validateJwtStructure(token) {
  assert.ok(typeof token === 'string', 'JWT token must be a string');
  const parts = token.split('.');
  assert.strictEqual(parts.length, 3, 'JWT must contain header, payload, and signature segments');

  const [headerB64, payloadB64] = parts;
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (err) {
    // Fallback to standard base64 if base64url fails
    header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
  }

  assert.ok(header.alg, 'JWT header must contain alg');
  assert.ok(payload.sub, 'JWT payload must contain sub (subject)');
  assert.ok(payload.exp, 'JWT payload must contain exp (expiration)');
  assert.ok(payload.iat, 'JWT payload must contain iat (issued at)');
  return { header, payload };
}

/**
 * Validates AuthResponse contract from POST /api/v1/auth/login or /refresh
 */
function validateAuthResponse(res) {
  assert.ok(res, 'Auth response must not be null/undefined');
  assert.ok(res.accessToken, 'Auth response must contain accessToken');
  assert.ok(res.refreshToken, 'Auth response must contain refreshToken');
  assert.strictEqual(res.tokenType, 'Bearer', 'tokenType must be "Bearer"');
  assert.strictEqual(typeof res.expiresIn, 'number', 'expiresIn must be a number');
  assert.ok(res.expiresIn > 0, 'expiresIn must be positive');

  // Verify JWT structure
  const { payload } = validateJwtStructure(res.accessToken);
  if (res.username) {
    assert.strictEqual(res.username, payload.sub, 'username must match JWT subject');
  }
  return true;
}

/**
 * Validates Product contract from GET /api/v1/products
 */
function validateProduct(product) {
  assert.ok(product, 'Product must not be null/undefined');
  assert.ok(typeof product.id === 'number', 'Product id must be a number');
  assert.ok(typeof product.sku === 'string' && product.sku.length > 0, 'Product sku must be non-empty string');
  assert.ok(typeof product.name === 'string' && product.name.length > 0, 'Product name must be non-empty string');
  assert.ok(typeof product.price === 'number' && product.price >= 0, 'Product price must be non-negative number');
  assert.ok(typeof product.quantity === 'number' && product.quantity >= 0, 'Product quantity must be non-negative integer');
  assert.ok(typeof product.reservedQuantity === 'number' && product.reservedQuantity >= 0, 'reservedQuantity must be non-negative');
  assert.ok(typeof product.availableQuantity === 'number' && product.availableQuantity >= 0, 'availableQuantity must be non-negative');
  assert.strictEqual(typeof product.active, 'boolean', 'active flag must be boolean');

  // Mathematical invariant
  assert.strictEqual(
    product.availableQuantity,
    product.quantity - product.reservedQuantity,
    `Mathematical invariant violated: available (${product.availableQuantity}) !== quantity (${product.quantity}) - reserved (${product.reservedQuantity})`
  );
  assert.ok(product.reservedQuantity <= product.quantity, 'reservedQuantity cannot exceed total quantity');
  return true;
}

/**
 * Validates Order confirmation contract from POST /api/v1/orders/{id}/confirm
 */
function validateOrderResponse(order) {
  assert.ok(order, 'Order response must not be null/undefined');
  assert.ok(typeof order.orderId === 'number' || typeof order.id === 'number', 'Order must have numeric ID');
  assert.strictEqual(order.status, 'CONFIRMED', 'Order status must be CONFIRMED');
  assert.ok(typeof order.totalAmount === 'number' && order.totalAmount >= 0, 'totalAmount must be non-negative number');
  assert.ok(order.confirmedAt, 'confirmedAt timestamp must be present');
  return true;
}

/**
 * Validates StockAuditLog entry
 */
function validateStockAuditLog(log) {
  assert.ok(log, 'Audit log must not be null/undefined');
  assert.ok(typeof log.id === 'number', 'Audit log must have numeric ID');
  assert.ok(typeof log.productId === 'number', 'productId must be numeric');
  assert.ok(['RESERVE', 'RELEASE', 'FULFILL', 'ADJUST'].includes(log.operationType), `Invalid operationType: ${log.operationType}`);
  assert.ok(typeof log.quantityDelta === 'number', 'quantityDelta must be a number');
  assert.ok(typeof log.reservedQuantityDelta === 'number', 'reservedQuantityDelta must be a number');
  assert.ok(typeof log.newQuantity === 'number' && log.newQuantity >= 0, 'newQuantity must be non-negative');
  assert.ok(typeof log.newReservedQuantity === 'number' && log.newReservedQuantity >= 0, 'newReservedQuantity must be non-negative');
  assert.ok(log.newReservedQuantity <= log.newQuantity, 'newReservedQuantity must not exceed newQuantity');
  return true;
}

/**
 * Validates Actuator Health Response
 */
function validateHealthResponse(health) {
  assert.ok(health, 'Health response must not be null/undefined');
  assert.ok(['UP', 'DOWN', 'OUT_OF_SERVICE', 'UNKNOWN'].includes(health.status), `Invalid overall health status: ${health.status}`);
  if (health.components) {
    if (health.components.db) {
      assert.ok(['UP', 'DOWN'].includes(health.components.db.status), 'DB component status must be UP or DOWN');
    }
    if (health.components.diskSpace) {
      assert.ok(['UP', 'DOWN'].includes(health.components.diskSpace.status), 'diskSpace component status must be UP or DOWN');
    }
  }
  return true;
}

/**
 * Validates CycloneDX SBOM format
 */
function validateCycloneDxSbom(sbom) {
  assert.ok(sbom, 'SBOM must not be null/undefined');
  assert.strictEqual(sbom.bomFormat, 'CycloneDX', 'bomFormat must be CycloneDX');
  assert.ok(['1.4', '1.5', '1.6'].includes(sbom.specVersion), `specVersion must be 1.4, 1.5, or 1.6, got ${sbom.specVersion}`);
  assert.ok(Array.isArray(sbom.components), 'components must be an array');
  assert.ok(sbom.components.length > 0, 'SBOM must contain components');
  return true;
}

module.exports = {
  validateJwtStructure,
  validateAuthResponse,
  validateProduct,
  validateOrderResponse,
  validateStockAuditLog,
  validateHealthResponse,
  validateCycloneDxSbom
};
