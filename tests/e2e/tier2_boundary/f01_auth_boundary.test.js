const { describe, it, assert } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');

describe('Tier 2 - F01 Boundary: JWT Authentication Corner Cases', () => {
  it('TC-B01-01: Empty or missing username/password rejected with HTTP 400 Bad Request', async () => {
    try {
      await client.login('', '');
      assert.fail('Should reject empty credentials');
    } catch (err) {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.code, 'INVALID_INPUT');
    }
  });

  it('TC-B01-02: Incorrect password rejected with HTTP 401 Unauthorized (INVALID_CREDENTIALS)', async () => {
    try {
      await client.login('admin', 'wrong_password_999');
      assert.fail('Should reject bad password');
    } catch (err) {
      assert.strictEqual(err.status, 401);
      assert.strictEqual(err.code, 'INVALID_CREDENTIALS');
    }
  });

  it('TC-B01-03: Invalid or non-existent refresh token rejected with HTTP 401 Unauthorized', async () => {
    try {
      await client.refresh('non-existent-uuid-00000000');
      assert.fail('Should reject unknown refresh token');
    } catch (err) {
      assert.strictEqual(err.status, 401);
      assert.strictEqual(err.code, 'TOKEN_EXPIRED');
    }
  });

  it('TC-B01-04: Malformed JWT token string fails signature verification', () => {
    assert.throws(
      () => client.simulated.verifyJwt('not.a.valid.jwt.token'),
      /MALFORMED_TOKEN/
    );
  });

  it('TC-B01-05: SQL injection attempt in username string handled safely without unauthorized access', async () => {
    try {
      await client.login("admin' OR '1'='1", "anything");
      assert.fail('Should reject SQL injection attempt');
    } catch (err) {
      assert.strictEqual(err.status, 401);
    }
  });
});
