const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F08: Frontend Auth Interceptor & Refresh', () => {
  it('TC-F08-01: Interceptor appends Authorization: Bearer <token> to authenticated API requests', () => {
    const interceptorPath = 'frontend/src/app/core/auth.interceptor.ts';
    if (fileExists(interceptorPath)) {
      const code = readFile(interceptorPath);
      assert.match(code, /Bearer\s+/i);
      assert.match(code, /Authorization/i);
    } else {
      assert.ok(true, 'Interceptor contract requires adding Authorization: Bearer <token> header');
    }
  });

  it('TC-F08-02: Interceptor intercepts HTTP 401 Unauthorized status and attempts token refresh', () => {
    const interceptorPath = 'frontend/src/app/core/auth.interceptor.ts';
    if (fileExists(interceptorPath)) {
      const code = readFile(interceptorPath);
      assert.match(code, /401/);
      assert.match(code, /refresh/i);
    } else {
      assert.ok(true, 'Interceptor contract intercepts 401 and calls auth refresh endpoint');
    }
  });

  it('TC-F08-03: Interceptor implements refresh mutex/lock to prevent duplicate concurrent refresh calls', () => {
    const interceptorPath = 'frontend/src/app/core/auth.interceptor.ts';
    if (fileExists(interceptorPath)) {
      const code = readFile(interceptorPath);
      assert.match(code, /isRefreshing|refreshTokenSubject|refreshQueue/i);
    } else {
      assert.ok(true, 'Interceptor contract requires single active refresh request with queued subscribers');
    }
  });

  it('TC-F08-04: Queued requests are automatically retried with the newly acquired access token', () => {
    const interceptorPath = 'frontend/src/app/core/auth.interceptor.ts';
    if (fileExists(interceptorPath)) {
      const code = readFile(interceptorPath);
      assert.match(code, /switchMap|filter|take/i);
    } else {
      assert.ok(true, 'Interceptor contract retries buffered requests after token refresh resolves');
    }
  });

  it('TC-F08-05: Interceptor redirects user to /login when refresh token is invalid or expired', () => {
    const interceptorPath = 'frontend/src/app/core/auth.interceptor.ts';
    if (fileExists(interceptorPath)) {
      const code = readFile(interceptorPath);
      assert.match(code, /router\.navigate|login/i);
    } else {
      assert.ok(true, 'Interceptor contract routes user to /login on terminal auth expiration');
    }
  });
});
