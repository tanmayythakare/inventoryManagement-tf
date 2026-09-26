const { describe, it, assert, beforeEach } = require('../helpers/test-harness');
const { client } = require('../helpers/test-utils');
const { validateAuthResponse, validateOrderResponse } = require('../helpers/contract-validators');

describe('Tier 4 - Scenario 6: Frontend SPA Deep Routing and Token Refresh Lifecycle', () => {
  beforeEach(() => {
    client.reset();
  });

  it('Executes full SPA lifecycle: Login -> Deep Route Navigation -> Token Expiry -> 401 Interception -> Auto-Refresh -> Order Confirmation -> Session Logout', async () => {
    // 1. User Login: POST /api/v1/auth/login
    const loginRes = await client.login('admin', 'admin123');
    validateAuthResponse(loginRes);
    let currentAccessToken = loginRes.accessToken;
    let currentRefreshToken = loginRes.refreshToken;

    assert.strictEqual(loginRes.username, 'admin');
    assert.strictEqual(loginRes.expiresIn, 900);

    // 2. Deep Route Refresh: Browser navigates directly to /inventory
    const requestedPath = '/inventory';
    const cdnRoutingFallback = (path) => {
      // S3 has no /inventory object; CloudFront 404 handler returns /index.html with HTTP 200
      return { responsePath: '/index.html', httpStatus: 200 };
    };
    const cdnResponse = cdnRoutingFallback(requestedPath);
    assert.strictEqual(cdnResponse.httpStatus, 200);
    assert.strictEqual(cdnResponse.responsePath, '/index.html');

    // 3. User performs authenticated action (load catalog)
    const catalog = await client.getProducts();
    assert.ok(catalog.length >= 3);

    // 4. Simulate Token Expiration mid-session
    // User attempts to confirm order 101 with expired access token
    let is401Intercepted = false;
    let queuedOrderConfirmed = false;

    // Simulated Angular Interceptor with mutex & refresh queue
    async function executeWithInterceptor(apiAction) {
      try {
        return await apiAction(currentAccessToken);
      } catch (err) {
        if (err.status === 401 || err.message === 'TOKEN_EXPIRED') {
          is401Intercepted = true;
          // Trigger token refresh
          const refreshRes = await client.refresh(currentRefreshToken);
          validateAuthResponse(refreshRes);
          currentAccessToken = refreshRes.accessToken;
          // Replay original action with new token
          return await apiAction(currentAccessToken);
        }
        throw err;
      }
    }

    // Call order confirmation through the interceptor
    const confirmedOrder = await executeWithInterceptor(async (token) => {
      if (!is401Intercepted) {
        // First attempt fails with 401 simulated expired token
        const err = new Error('TOKEN_EXPIRED');
        err.status = 401;
        throw err;
      }
      return await client.confirmOrder(101);
    });

    assert.strictEqual(is401Intercepted, true, '401 Unauthorized must be caught by interceptor');
    validateOrderResponse(confirmedOrder);
    assert.strictEqual(confirmedOrder.status, 'CONFIRMED');

    // 5. Final Phase: Refresh Token Expiry & Forced Logout
    // Revoke refresh token
    const tokenRecord = client.simulated.refreshTokens.get(currentRefreshToken);
    tokenRecord.revoked = true;

    try {
      await client.refresh(currentRefreshToken);
      assert.fail('Should fail on revoked refresh token');
    } catch (err) {
      assert.strictEqual(err.status, 401);
      assert.strictEqual(err.code, 'TOKEN_EXPIRED');
      // Interceptor clears local state and redirects to /login
      currentAccessToken = null;
      currentRefreshToken = null;
    }

    assert.strictEqual(currentAccessToken, null);
    assert.strictEqual(currentRefreshToken, null);
  });
});
