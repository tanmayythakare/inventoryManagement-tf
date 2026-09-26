const { describe, it, assert } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateAuthResponse, validateJwtStructure } = require('../helpers/contract-validators');

describe('Tier 1 - F01: JWT Authentication (/api/v1/auth/login, /api/v1/auth/refresh)', () => {
  it('TC-F01-01: Valid user credentials return HTTP 200 with JWT access token and refresh token', async () => {
    const res = await client.login('admin', 'admin123');
    validateAuthResponse(res);
    assert.strictEqual(res.username, 'admin');
    assert.ok(res.roles.includes('ADMIN'));
    assert.strictEqual(res.tokenType, 'Bearer');
    assert.strictEqual(res.expiresIn, 900);
  });

  it('TC-F01-02: Issued JWT access token adheres to standard 3-part format and contains expected claims', async () => {
    const res = await client.login('user', 'user123');
    const { header, payload } = validateJwtStructure(res.accessToken);
    assert.strictEqual(header.alg, 'HS256');
    assert.strictEqual(payload.sub, 'user');
    assert.ok(Array.isArray(payload.roles));
    assert.ok(payload.exp > payload.iat);
    assert.strictEqual(payload.exp - payload.iat, 900);
  });

  it('TC-F01-03: Refresh token endpoint issues a new valid access token given an active refresh token', async () => {
    const loginRes = await client.login('admin', 'admin123');
    const refreshRes = await client.refresh(loginRes.refreshToken);
    validateAuthResponse(refreshRes);
    assert.strictEqual(refreshRes.tokenType, 'Bearer');
    assert.strictEqual(refreshRes.expiresIn, 900);
    assert.ok(refreshRes.accessToken.length > 0);
  });

  it('TC-F01-04: Non-admin standard user receives proper role assignments without elevated privileges', async () => {
    const res = await client.login('user', 'user123');
    const { payload } = validateJwtStructure(res.accessToken);
    assert.ok(payload.roles.includes('USER'));
    assert.ok(!payload.roles.includes('SUPERADMIN'));
  });

  it('TC-F01-05: Access token expiration window is strictly 15 minutes (900 seconds)', async () => {
    const res = await client.login('admin', 'admin123');
    assert.strictEqual(res.expiresIn, 900);
    const { payload } = validateJwtStructure(res.accessToken);
    const duration = payload.exp - payload.iat;
    assert.strictEqual(duration, 900);
  });
});
