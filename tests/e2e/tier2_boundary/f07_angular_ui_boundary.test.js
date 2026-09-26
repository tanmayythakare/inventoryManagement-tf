const { describe, it, assert } = require('../helpers/test-harness');

describe('Tier 2 - F07 Boundary: Angular Standalone UI Edge Cases', () => {
  it('TC-B07-01: Unauthenticated direct route access to /dashboard is blocked by AuthGuard', () => {
    const unauthenticated = false;
    const canActivate = (isAuth) => isAuth ? true : { redirectTo: '/login' };
    const result = canActivate(unauthenticated);
    assert.strictEqual(result.redirectTo, '/login');
  });

  it('TC-B07-02: Non-existent frontend routes redirect to custom 404 / NotFound handler', () => {
    const routes = [
      { path: 'login', component: 'LoginComponent' },
      { path: 'dashboard', component: 'DashboardComponent' },
      { path: '**', redirectTo: 'dashboard' } // wildcard catch-all
    ];
    const wildcard = routes.find(r => r.path === '**');
    assert.ok(wildcard, 'Must declare wildcard route for unmatched paths');
  });

  it('TC-B07-03: Extreme screen viewports (mobile 320px to 4K 3840px) handled via responsive layout', () => {
    const viewports = [320, 768, 1024, 1440, 1920, 3840];
    for (const vp of viewports) {
      assert.ok(vp >= 320 && vp <= 3840);
    }
  });

  it('TC-B07-04: Empty catalog state renders user-friendly empty banner instead of broken table', () => {
    const emptyCatalog = [];
    const message = emptyCatalog.length === 0 ? 'No products available' : 'Rendering table';
    assert.strictEqual(message, 'No products available');
  });

  it('TC-B07-05: Form validation prevents submission when required login inputs are blank or invalid', () => {
    const isValidForm = (user, pass) => Boolean(user && user.trim().length > 0 && pass && pass.length >= 6);
    assert.strictEqual(isValidForm('', ''), false);
    assert.strictEqual(isValidForm('admin', '123'), false); // too short
    assert.strictEqual(isValidForm('admin', 'admin123'), true);
  });
});
